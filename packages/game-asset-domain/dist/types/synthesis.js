export function isContentSynthesisProvider(asset) {
    return (typeof asset === 'object' &&
        asset !== null &&
        'synthesizeUIContent' in asset &&
        typeof asset.synthesizeUIContent === 'function');
}
