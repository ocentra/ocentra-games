let loaderInstance = null;
export function setAssetLoader(loader) {
    loaderInstance = loader;
}
export function getAssetLoader() {
    return loaderInstance;
}
