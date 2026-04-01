export const DEFAULT_MODEL_ENTRIES = [
    {
        modelId: 'onnx-community/Phi-3.5-mini-instruct-onnx-web',
        displayName: 'Phi-3.5 Mini (Transformers.js)',
        description: 'TabAgent baseline model for browser-local inference.',
        quants: [{ path: 'onnx/model_q4f16.onnx', dtype: 'q4f16', enabled: true, priority: 1 }],
        enabled: true,
        priority: 1,
        tags: ['phi', 'instruct', 'onnx'],
    },
    {
        modelId: 'HuggingFaceTB/SmolLM2-360M-Instruct',
        displayName: 'SmolLM2-360M Instruct',
        description: 'Compact instruct model for browser-local chat.',
        quants: [
            { path: 'onnx/model_q4f16.onnx', dtype: 'q4f16', enabled: true, priority: 1 },
            { path: 'onnx/model_q4.onnx', dtype: 'q4', enabled: true, priority: 2 },
        ],
        enabled: true,
        priority: 2,
        tags: ['smol', 'instruct', 'onnx'],
    },
    {
        modelId: 'HuggingFaceTB/SmolLM2-1.7B-Instruct',
        displayName: 'SmolLM2-1.7B Instruct',
        description: 'Higher quality small instruct model for browser-local usage.',
        quants: [
            { path: 'onnx/model_q4f16.onnx', dtype: 'q4f16', enabled: true, priority: 1 },
            { path: 'onnx/model_q4.onnx', dtype: 'q4', enabled: true, priority: 2 },
        ],
        enabled: true,
        priority: 3,
        tags: ['smol', 'instruct', 'onnx'],
    },
    {
        modelId: 'HuggingFaceTB/SmolLM3-3B-ONNX',
        displayName: 'SmolLM3-3B ONNX',
        description: 'SmolLM3 ONNX model for stronger local responses.',
        quants: [
            { path: 'onnx/model_q4f16.onnx', dtype: 'q4f16', enabled: true, priority: 1 },
            { path: 'onnx/model_q4.onnx', dtype: 'q4', enabled: true, priority: 2 },
        ],
        enabled: true,
        priority: 4,
        tags: ['smol', 'onnx', 'q4'],
    },
    {
        modelId: 'onnx-community/Qwen3-1.7B-ONNX',
        displayName: 'Qwen3-1.7B',
        description: 'Qwen ONNX option for browser-local inference.',
        quants: [
            { path: 'onnx/model_q4f16.onnx', dtype: 'q4f16', enabled: true, priority: 1 },
            { path: 'onnx/model_q4.onnx', dtype: 'q4', enabled: true, priority: 2 },
        ],
        enabled: true,
        priority: 5,
        tags: ['qwen', 'onnx', 'q4'],
    },
];
