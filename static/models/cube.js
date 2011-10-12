SceneJS.createScene({
    type: 'scene',
    id: 'Scene',
    canvasId: 'scenejsCanvas',
    loggingElementId: 'scenejsLog',
    flags:
        {
            backfaces: false, 
        },
    nodes: [
        {
            type: 'library',
            nodes: [
                {
                    type: 'material',
                    coreId: 'cube-mat',
                    baseColor:
                        {
                            r: 0.64,
                            b: 0.64,
                            g: 0.64,
                        },
                    emit: 0.0,
                },
                {
                    type: 'geometry',
                    coreId: 'cube-mesh',
                    primitive: 'triangles',
                    resource: 'cube-mesh',
                    positions: [1.0,1.0,-1.0,1.0,-1.0,-1.0,-1.0,-1.0,-1.0,-1.0,1.0,-1.0,1.0,1.0,1.0,1.0,-1.0,1.0,-1.0,-1.0,1.0,-1.0,1.0,1.0,1.0,1.0,-1.0,1.0,1.0,1.0,1.0,-1.0,1.0,1.0,-1.0,-1.0,1.0,-1.0,-1.0,1.0,-1.0,1.0,-1.0,-1.0,1.0,-1.0,-1.0,-1.0,-1.0,-1.0,-1.0,-1.0,-1.0,1.0,-1.0,1.0,1.0,-1.0,1.0,-1.0,1.0,1.0,1.0,1.0,1.0,-1.0,-1.0,1.0,-1.0,-1.0,1.0,1.0,],
                    indices: [0,1,2,0,2,3,4,7,6,4,6,5,8,9,10,8,10,11,12,13,14,12,14,15,16,17,18,16,18,19,20,21,22,20,22,23,],
                },
            ],
        },
        {
            type: 'lookAt',
            id: 'main-lookAt',
            eye:
                {
                    y: -10.0,
                    x: 10.0,
                    z: 5.0,
                },
            look:
                {
                    y: 0.0,
                    x: 0.0,
                    z: 0.0,
                },
            up:
                {
                    y: 0.0,
                    x: 0.0,
                    z: 1.0,
                },
            nodes: [
                {
                    type: 'camera',
                    id: 'main-camera',
                    optics:
                        {
                            type: 'perspective',
                            far: 100.0,
                            near: 0.1,
                            aspect: 1.0,
                            fovy: 27.6380627952,
                        },
                    nodes: [
                        {
                            type: 'renderer',
                            id: 'main-renderer',
                            clear:
                                {
                                    color: true, 
                                    depth: true, 
                                    stencil: false, 
                                },
                            clearColor:
                                {
                                    r: 0.4,
                                    b: 0.4,
                                    g: 0.4,
                                },
                            nodes: [
                                {
                                    type: 'matrix',
                                    id: 'light0-transform',
                                    elements: [-0.290864378214,0.955171227455,-0.055189050734,0.0,-0.771100878716,-0.199883162975,0.604524791241,0.0,0.566393375397,0.218391060829,0.794672250748,0.0,4.07624483109,1.00545394421,5.90386199951,1.0,],
                                    nodes: [
                                        {
                                            type: 'light',
                                            id: 'light0',
                                            color:
                                                {
                                                    r: 1.0,
                                                    b: 1.0,
                                                    g: 1.0,
                                                },
                                            pos:
                                                {
                                                    y: 0.0,
                                                    x: 0.0,
                                                    z: 0.0,
                                                },
                                            quadraticAttenuation: 0.000555556,
                                            linearAttenuation: 0.0,
                                            mode: 'point',
                                            constantAttenuation: 1.0,
                                        },
                                    ],
                                },
                                {
                                    type: 'matrix',
                                    id: 'light1-transform',
                                    elements: [1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,1.32968401909,-2.12760996819,2.74223303795,1.0,],
                                    nodes: [
                                        {
                                            type: 'light',
                                            id: 'light1',
                                            color:
                                                {
                                                    r: 1.0,
                                                    b: 1.0,
                                                    g: 1.0,
                                                },
                                            pos:
                                                {
                                                    y: 0.0,
                                                    x: 0.0,
                                                    z: 0.0,
                                                },
                                            quadraticAttenuation: 0.0008,
                                            linearAttenuation: 0.0,
                                            mode: 'point',
                                            constantAttenuation: 1.0,
                                        },
                                    ],
                                },
                                {
                                    type: 'matrix',
                                    id: 'cube-transform',
                                    elements: [1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,],
                                    nodes: [
                                        {
                                            type: 'material',
                                            coreId: 'cube-mat',
                                            nodes: [
                                                {
                                                    type: 'geometry',
                                                    coreId: 'cube-mesh',
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    ],
});
