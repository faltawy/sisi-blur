import { Human, type Config } from '@vladmandic/human';


const modelsPath = chrome.runtime.getURL('/models/');

const humanConfig = <Config>{
    debug: false,
    async: true,
    modelBasePath: modelsPath,
    filter: { enabled: true, equalization: true },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
    gesture: { enabled: true },
    face: {
        enabled: true,
        detector: { rotation: true, return: true, mask: false },
        description: { enabled: false },
        iris: { enabled: true },
        emotion: { enabled: false },
        antispoof: { enabled: true },
        liveness: { enabled: false },
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
        "samples/196379927_342631387227961_6698731964075942026_n.jpg",
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
            for (const face of detection.face) {
                if (face.embedding) {
                    processed.push({
                        id: sample.id,
                        descriptors: face.embedding
                    });
                }
            }
        }
    }

    return processed;
}


const human = new Human(humanConfig);

self.human = human;

export interface ComparisonResult {
    id: string;
    faces: {
        similarity: number;
        sampleId?: string;
    }[];
}

interface FaceMatch {
    similarity: number;
    sampleId: string;
}

function compareFaceToSamples(faceEmbedding: number[], processed: FaceRecord[]): FaceMatch[] {
    return processed.map(record => ({
        similarity: human.match.similarity(faceEmbedding, record.descriptors),
        sampleId: record.id
    })).sort((a, b) => b.similarity - a.similarity);
}

async function* compareImagesGenerator(images: { id: string, src: string }[], processed: FaceRecord[]): AsyncGenerator<undefined | ComparisonResult> {
    for (const { id, src } of images) {
        try {
            const image = await fetchImageToImageBitmap(src);
            const result = await human.detect(image);
            const payload: ComparisonResult = {
                id,
                faces: []
            }

            for (const face of result.face) {
                if (face.embedding) {
                    const matches = compareFaceToSamples(face.embedding, processed);
                    payload.faces.push(...matches);
                }
            }

            yield payload;

        } catch (error) {
            console.error('Error in compareImage:', error);
            yield undefined;
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
            })();

            return true;
        }
    });

}


setTimeout(main, 0);

declare global {
    var human: Human;
}


export { main }