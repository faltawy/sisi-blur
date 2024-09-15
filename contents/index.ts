import type { ComparisonResult } from "~background";
import { extensionSettings } from "~utils/settings";

const SIZE = 25;

function attachBlurUiToImage(image: HTMLImageElement, _meta: {
    blurAmount: number;
}) {
    image.style.filter = `blur(${_meta.blurAmount}px)`;
    image.setAttribute('data-blur-id', 'true'); // Mark the image as processed
}

let alpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function genUniqueId(length = 10) {
    let result = '';
    for (let i = length; i > 0; --i) result += alpha[Math.round(Math.random() * (alpha.length - 1))];
    return result;
}

async function processImages(images: HTMLImageElement[]) {
    const settings = await extensionSettings.get();

    if (!settings.enabled) {
        return;
    }

    const imagesToProcess = Array.from(images).filter(image => image.height >= SIZE);
    const payload = imagesToProcess.map(image => {
        const id = genUniqueId(10);
        image.setAttribute('data-blur-id', id);
        return { id, src: image.src };
    });

    chrome.runtime.sendMessage({
        name: "compare",
        payload,
    })
}

function getUnprocessedImages() {
    // order by apperance in viewport

    let elements = document.querySelectorAll('img:not([data-blur-id])') as NodeListOf<HTMLImageElement>;
    let elements_array = Array.from(elements)
        .sort((a, b) => a.offsetTop - b.offsetTop)
    return elements_array;
}

function observeDocumentMutation() {
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                const images = getUnprocessedImages();
                processImages(images);
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false,
    });
}


window.addEventListener('load', function () {
    const images = getUnprocessedImages();
    processImages(images);
    observeDocumentMutation();
});

chrome.runtime.onMessage.addListener(
    async function (request, sender, sendResponse) {
        const settings = await extensionSettings.get();
        if (request.name === "compare-result" && request.body) {
            const { id, faces } = request.body as ComparisonResult;
            const image = document.querySelector(`img[data-blur-id="${id}"]`) as HTMLImageElement;
            faces.filter(face => face.sampleId === "abdel_fattah_sisi")
                .forEach(face => {
                    if (face.similarity >= 0.4) {
                        attachBlurUiToImage(image, {
                            blurAmount: settings.blurAmount
                        });
                    }
                });
        }

        return true;
    }
);