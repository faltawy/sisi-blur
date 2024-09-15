const SIZE = 50;
const INTERVAL = 2000;
let LAST_PROCESSED = new Date();

function attachBlurUiToImage(image: HTMLImageElement) {
    image.style.filter = 'blur(5px)';
    image.setAttribute('data-blur-id', 'true'); // Mark the image as processed
}

let alpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function genUniqueId(length = 10) {
    let result = '';
    for (let i = length; i > 0; --i) result += alpha[Math.round(Math.random() * (alpha.length - 1))];
    return result;
}

function processImages(images: NodeListOf<HTMLImageElement>) {

    if (LAST_PROCESSED.getTime() + INTERVAL > new Date().getTime()) {
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

    LAST_PROCESSED = new Date();
}

function getUnprocessedImages() {
    return document.querySelectorAll('img:not([data-blur-id])') as NodeListOf<HTMLImageElement>;
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

observeDocumentMutation();

window.addEventListener('load', function () {
    const images = getUnprocessedImages();
    processImages(images);
});

setInterval(() => {
    const images = getUnprocessedImages();
    processImages(images);
}, 1000);

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log(request, sender);
        if (request.name === "compare-result") {
            const { id, result } = request.body;
            const image = document.querySelector(`img[data-blur-id="${id}"]`) as HTMLImageElement;
            if (image && result && result.similarity > 0.4) { // Adjust threshold as needed
                attachBlurUiToImage(image);
            }
        }
    }
);