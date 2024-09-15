import { StorageItem } from "webext-storage";

const DEFAULT_SETTINGS = {
    enabled: true,
    blurAmount: 5,
    whiteListedDomains: [
        `https://www.facebook.com`,
    ],
}

type ExtensionSettings = typeof DEFAULT_SETTINGS

export function getDefaultSettings() {
    return DEFAULT_SETTINGS;
}

const extensionSettings = new StorageItem("settings", {
    area: "local",
    defaultValue: DEFAULT_SETTINGS
})

export {
    type ExtensionSettings,
    extensionSettings,
}