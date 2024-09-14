import { Human, type Config } from '@vladmandic/human';

const humanConfig = <Config>{
    debug: false,
    async: true,
    modelBasePath: "static/models",
    filter: { enabled: true, equalization: true },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
    gesture: { enabled: true },
    face: {
        enabled: true,
        detector: { rotation: true, return: true, mask: false },
        description: { enabled: true },
        iris: { enabled: true },
        emotion: { enabled: false },
        antispoof: { enabled: true },
        liveness: { enabled: true },
    }
}

type Sample = {
    id: string;
    name: string;
    images: string[];
}

export interface FaceRecord {
    id: string;
    descriptors: number[];
}

const samples: Sample[] = [{
    id: "abdel_fattah_sisi",
    name: "Abdel Fattah Sisi",
    images: [
        "samples/220px-Abdel_Fatah_al-Sisi_2.jpg",
        "samples/AbdelFattah_Elsisi.jpg",
        "samples/220px-General_Al-Sisi,_announcing_the_removal_of_President_Morsi.png"
    ]
}]


function isDataUrl(url: string) {
    return url.startsWith('data:');
}

async function fetchImageToImageBitmap(url: string): Promise<ImageBitmap> {
    if (isDataUrl(url)) {
        const image = await createImageBitmap(await (await fetch(url)).blob());
        return image;
    }
    const response = await fetch(url);
    const blob = await response.blob();
    return await createImageBitmap(blob);
}

async function preprocessSampleImages(human: Human) {
    const processed: FaceRecord[] = [];

    for (const sample of samples) {
        const images = await Promise.all(sample.images.map(async (_image) => {
            const res = await fetchImageToImageBitmap(chrome.runtime.getURL(_image));
            return res;
        }));

        const detections = await Promise.all(images.map(async (image) => {
            return await human.detect(image);
        }));

        for (const detection of detections) {
            const face = detection.face.at(0);
            if (!face) {
                continue;
            }
            const descriptor = face.embedding;
            processed.push({
                id: sample.id,
                descriptors: descriptor
            });
        }
    }

    return processed;
}


const human = new Human(humanConfig);

const matchOptions = { order: 2, multiplier: 25, min: 0.2, max: 0.8 }; // for faceres model

const options = {
    minConfidence: 0.6, // overal face confidence for box, face, gender, real, live
    minSize: 224, // min input to face descriptor model before degradation
    maxTime: 30000, // max time before giving up
    blinkMin: 10, // minimum duration of a valid blink
    blinkMax: 800, // maximum duration of a valid blink
    threshold: 0.5, // minimum similarity
    distanceMin: 0.4, // closest that face is allowed to be to the cammera in cm
    distanceMax: 1.0, // farthest that face is allowed to be to the cammera in cm
    mask: humanConfig.face.detector.mask,
    rotation: humanConfig.face.detector.rotation,
    ...matchOptions,
};

self.human = human;

interface ComparisonResult {
    id: string;
    similarity: number;
    distance: number;
}

async function compareImage(imageUrl: string, processed: FaceRecord[]): Promise<ComparisonResult | undefined> {
    try {
        const image = await fetchImageToImageBitmap(imageUrl);
        const result = await human.detect(image, { face: { detector: { return: true } } });
        const face = result.face.at(0);
        if (face?.embedding) {
            const descriptor = face.embedding;
            return processed.reduce<ComparisonResult | undefined>((bestMatch, record) => {
                const distance = human.match.distance(descriptor, record.descriptors);
                const similarity = human.match.similarity(descriptor, record.descriptors);
                if (!bestMatch || similarity > bestMatch.similarity) {
                    return { id: record.id, similarity, distance };
                }
                return bestMatch;
            }, undefined);
        }
    } catch (error) {
        console.error('Error in compareImage:', error);
    }
    return undefined;
}

async function* compareImagesGenerator(images: { id: string, src: string }[], processed: FaceRecord[]): AsyncGenerator<{ id: string, result: ComparisonResult | undefined }> {
    for (const { id, src } of images) {
        try {
            const image = await fetchImageToImageBitmap(src);
            const result = await human.detect(image, { face: { detector: { return: true } } });
            const face = result.face[0];

            if (face?.embedding) {
                const descriptor = face.embedding;
                const bestMatch = processed.reduce<ComparisonResult | undefined>((best, record) => {
                    const distance = human.match.distance(descriptor, record.descriptors);
                    const similarity = human.match.similarity(descriptor, record.descriptors);
                    return (!best || similarity > best.similarity)
                        ? { id: record.id, similarity, distance }
                        : best;
                }, undefined);

                yield { id, result: bestMatch };
            } else {
                yield { id, result: undefined };
            }
        } catch (error) {
            console.error('Error in compareImage:', error);
            yield { id, result: undefined };
        }
    }
}


async function main() {
    await human.load()
    await human.init()
    const processed = await preprocessSampleImages(human);

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.name === "compare") {
            sendResponse({ status: "processing" });
            (async () => {
                for await (const result of compareImagesGenerator(request.payload, processed)) {
                    if (sender.tab && sender.tab.id) {
                        chrome.tabs.sendMessage(sender.tab.id, {
                            name: "compare-result",
                            body: result,
                        });
                    }
                }
                // Send a message to indicate all processing is complete
                if (sender.tab && sender.tab.id) {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        name: "compare-complete"
                    });
                }
            })();

            return true;
        }
    });

}





setTimeout(main, 1000);

declare global {
    var human: Human;
}

chrome.tabs.query({ active: true, currentWindow: true, }, function (tabs) {

});



export { main }