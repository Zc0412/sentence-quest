/** 云托管 HTTP API 的 OpenAPI 3.0 描述，供 Swagger UI 与客户端生成工具使用。 */
export const openApiDocument = {
    openapi: '3.0.3',
    info: {
        title: 'SentLeap Cloud Service API',
        version: '1.0.0',
        description: 'SentLeap 发音和云端题库接口。管理员写接口使用 Bearer 管理令牌。',
    },
    servers: [{url: '/'}],
    tags: [
        {name: 'Health', description: '服务健康检查'},
        {name: 'Pronunciation', description: '英语发音'},
        {name: 'Dictionaries', description: '公开题库读取'},
        {name: 'Admin', description: '管理员题库管理'},
    ],
    paths: {
        '/health': {
            get: {
                tags: ['Health'],
                summary: '健康检查',
                responses: {
                    '200': {
                        description: '进程可响应',
                        content: {'application/json': {schema: {$ref: '#/components/schemas/HealthResponse'}}},
                    },
                },
            },
        },
        '/api/pronunciation': {
            post: {
                tags: ['Pronunciation'],
                summary: '获取英语发音音频',
                requestBody: {
                    required: true,
                    content: {'application/json': {schema: {$ref: '#/components/schemas/PronunciationRequest'}}},
                },
                responses: {
                    '200': {
                        description: '发音成功',
                        content: {'application/json': {schema: {$ref: '#/components/schemas/PronunciationResponse'}}},
                    },
                    '400': {
                        description: '请求参数无效或上游发音服务不可用',
                        content: {'application/json': {schema: {$ref: '#/components/schemas/PronunciationResponse'}}},
                    },
                    '500': {$ref: '#/components/responses/ServerError'},
                },
            },
        },
        '/api/dictionaries': {
            get: {
                tags: ['Dictionaries'],
                summary: '获取已发布题库目录',
                responses: {
                    '200': {
                        description: '公开题库目录',
                        content: {'application/json': {schema: {$ref: '#/components/schemas/DictionaryListResponse'}}},
                    },
                    '500': {$ref: '#/components/responses/ServerError'},
                },
            },
        },
        '/api/dictionaries/{id}': {
            get: {
                tags: ['Dictionaries'],
                summary: '获取题库公开资料',
                parameters: [{$ref: '#/components/parameters/DictionaryId'}],
                responses: {
                    '200': {
                        description: '题库资料',
                        content: {'application/json': {schema: {$ref: '#/components/schemas/DictionaryResponse'}}},
                    },
                    '400': {$ref: '#/components/responses/BadRequest'},
                    '404': {$ref: '#/components/responses/NotFound'},
                    '500': {$ref: '#/components/responses/ServerError'},
                },
            },
        },
        '/api/dictionaries/{id}/content': {
            get: {
                tags: ['Dictionaries'],
                summary: '分页获取已发布题库内容',
                parameters: [
                    {$ref: '#/components/parameters/DictionaryId'},
                    {
                        name: 'offset',
                        in: 'query',
                        description: '从题库中的第几条开始读取',
                        schema: {type: 'integer', minimum: 0, default: 0},
                    },
                    {
                        name: 'version',
                        in: 'query',
                        description: '目录返回的 SHA-256 版本标识，用于检测题库更新',
                        schema: {type: 'string', pattern: '^[a-f0-9]{64}$'},
                    },
                ],
                responses: {
                    '200': {
                        description: '题库内容分页；next 为 null 时表示结束',
                        content: {'application/json': {schema: {$ref: '#/components/schemas/DictionaryContentResponse'}}},
                    },
                    '400': {$ref: '#/components/responses/BadRequest'},
                    '404': {$ref: '#/components/responses/NotFound'},
                    '409': {
                        description: '题库版本已更新，需要刷新目录',
                        content: {'application/json': {schema: {$ref: '#/components/schemas/ErrorResponse'}}},
                    },
                    '413': {
                        description: '单条题目超过响应大小限制',
                        content: {'application/json': {schema: {$ref: '#/components/schemas/ErrorResponse'}}},
                    },
                    '500': {$ref: '#/components/responses/ServerError'},
                },
            },
        },
        '/api/admin/dictionaries': {
            post: {
                tags: ['Admin'],
                summary: '创建题库',
                description: '上传题库 JSON 到云存储并登记元数据。请求体最大 5 MiB。',
                security: [{AdminBearerAuth: []}],
                requestBody: {
                    required: true,
                    content: {'application/json': {schema: {$ref: '#/components/schemas/CreateDictionaryRequest'}}},
                },
                responses: {
                    '201': {
                        description: '题库已创建',
                        content: {'application/json': {schema: {$ref: '#/components/schemas/DictionaryResponse'}}},
                    },
                    '400': {$ref: '#/components/responses/BadRequest'},
                    '401': {$ref: '#/components/responses/Unauthorized'},
                    '409': {
                        description: '题库 ID 已存在',
                        content: {'application/json': {schema: {$ref: '#/components/schemas/ErrorResponse'}}},
                    },
                    '413': {$ref: '#/components/responses/PayloadTooLarge'},
                    '500': {$ref: '#/components/responses/ServerError'},
                },
            },
        },
        '/api/admin/dictionaries/{id}': {
            put: {
                tags: ['Admin'],
                summary: '更新题库资料或内容',
                description: '题库 ID 和类型不可修改；提供 entries 时会上传替换内容。',
                security: [{AdminBearerAuth: []}],
                parameters: [{$ref: '#/components/parameters/DictionaryId'}],
                requestBody: {
                    required: true,
                    content: {'application/json': {schema: {$ref: '#/components/schemas/UpdateDictionaryRequest'}}},
                },
                responses: {
                    '200': {
                        description: '题库已更新',
                        content: {'application/json': {schema: {$ref: '#/components/schemas/DictionaryResponse'}}},
                    },
                    '400': {$ref: '#/components/responses/BadRequest'},
                    '401': {$ref: '#/components/responses/Unauthorized'},
                    '404': {$ref: '#/components/responses/NotFound'},
                    '413': {$ref: '#/components/responses/PayloadTooLarge'},
                    '500': {$ref: '#/components/responses/ServerError'},
                },
            },
            delete: {
                tags: ['Admin'],
                summary: '下架题库',
                description: '将题库状态改为 archived，不删除数据库记录或云文件。',
                security: [{AdminBearerAuth: []}],
                parameters: [{$ref: '#/components/parameters/DictionaryId'}],
                responses: {
                    '200': {
                        description: '题库已下架',
                        content: {'application/json': {schema: {$ref: '#/components/schemas/SuccessResponse'}}},
                    },
                    '400': {$ref: '#/components/responses/BadRequest'},
                    '401': {$ref: '#/components/responses/Unauthorized'},
                    '404': {$ref: '#/components/responses/NotFound'},
                    '500': {$ref: '#/components/responses/ServerError'},
                },
            },
        },
    },
    components: {
        securitySchemes: {
            AdminBearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'Admin token',
                description: '填写云托管环境变量 DICTIONARY_ADMIN_TOKEN 的值，不要在公开环境中分享。',
            },
        },
        parameters: {
            DictionaryId: {
                name: 'id',
                in: 'path',
                required: true,
                description: '题库 ID',
                schema: {type: 'string', pattern: '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$'},
            },
        },
        responses: {
            BadRequest: {
                description: '请求参数或请求体无效',
                content: {'application/json': {schema: {$ref: '#/components/schemas/ErrorResponse'}}},
            },
            Unauthorized: {
                description: '缺少或提供了无效的管理员令牌',
                content: {'application/json': {schema: {$ref: '#/components/schemas/ErrorResponse'}}},
            },
            NotFound: {
                description: '题库不存在或不可见',
                content: {'application/json': {schema: {$ref: '#/components/schemas/ErrorResponse'}}},
            },
            PayloadTooLarge: {
                description: '请求体超过 5 MiB',
                content: {'application/json': {schema: {$ref: '#/components/schemas/ErrorResponse'}}},
            },
            ServerError: {
                description: '服务暂不可用',
                content: {'application/json': {schema: {$ref: '#/components/schemas/ErrorResponse'}}},
            },
        },
        schemas: {
            HealthResponse: {
                type: 'object',
                required: ['ok'],
                properties: {ok: {type: 'boolean', example: true}},
            },
            ErrorResponse: {
                type: 'object',
                required: ['error'],
                properties: {error: {type: 'string'}},
            },
            SuccessResponse: {
                type: 'object',
                required: ['ok'],
                properties: {ok: {type: 'boolean', example: true}},
            },
            Dictionary: {
                type: 'object',
                required: ['id', 'label', 'kind', 'category', 'wordCount', 'sha256'],
                properties: {
                    id: {type: 'string', example: 'cet4'},
                    label: {type: 'string', example: '四级词汇'},
                    kind: {type: 'string', enum: ['word', 'phrase']},
                    category: {type: 'string', example: '考试词汇'},
                    wordCount: {type: 'integer', minimum: 1},
                    sha256: {type: 'string', pattern: '^[a-f0-9]{64}$'},
                },
            },
            DictionaryListResponse: {
                type: 'object',
                required: ['dictionaries'],
                properties: {dictionaries: {type: 'array', items: {$ref: '#/components/schemas/Dictionary'}}},
            },
            DictionaryResponse: {
                type: 'object',
                required: ['dictionary'],
                properties: {dictionary: {$ref: '#/components/schemas/Dictionary'}},
            },
            DictionaryContentResponse: {
                type: 'object',
                required: ['items', 'next', 'sha256'],
                properties: {
                    items: {type: 'array', items: {type: 'object', additionalProperties: true}},
                    next: {type: 'integer', nullable: true, description: '下一页偏移；null 表示结束'},
                    sha256: {type: 'string', pattern: '^[a-f0-9]{64}$'},
                },
            },
            PronunciationRequest: {
                type: 'object',
                required: ['word', 'type'],
                properties: {
                    word: {type: 'string', minLength: 1, maxLength: 500, example: 'hello'},
                    type: {type: 'string', enum: ['1', '2'], description: '1 为英音，2 为美音'},
                },
            },
            PronunciationResponse: {
                type: 'object',
                required: ['ok'],
                properties: {
                    ok: {type: 'boolean'},
                    audio: {type: 'string', format: 'byte', description: 'Base64 编码的音频'},
                    error: {type: 'string'},
                },
            },
            WordEntry: {
                type: 'object',
                required: ['name', 'trans'],
                properties: {
                    name: {type: 'string'},
                    trans: {type: 'array', minItems: 1, items: {type: 'string'}},
                },
            },
            PhraseEntry: {
                type: 'object',
                required: ['id', 'zh', 'english', 'words'],
                properties: {
                    id: {type: 'string'},
                    zh: {type: 'string'},
                    english: {type: 'string'},
                    words: {type: 'array', minItems: 1, items: {type: 'string'}},
                },
            },
            CreateDictionaryRequest: {
                oneOf: [
                    {
                        type: 'object',
                        required: ['id', 'label', 'kind', 'entries'],
                        properties: {
                            id: {$ref: '#/components/schemas/DictionaryIdValue'},
                            label: {type: 'string', maxLength: 100},
                            kind: {type: 'string', enum: ['word']},
                            category: {type: 'string', maxLength: 100},
                            status: {type: 'string', enum: ['published', 'draft', 'archived']},
                            entries: {type: 'array', minItems: 1, items: {$ref: '#/components/schemas/WordEntry'}},
                        },
                    },
                    {
                        type: 'object',
                        required: ['id', 'label', 'kind', 'entries'],
                        properties: {
                            id: {$ref: '#/components/schemas/DictionaryIdValue'},
                            label: {type: 'string', maxLength: 100},
                            kind: {type: 'string', enum: ['phrase']},
                            category: {type: 'string', maxLength: 100},
                            status: {type: 'string', enum: ['published', 'draft', 'archived']},
                            entries: {type: 'array', minItems: 1, items: {$ref: '#/components/schemas/PhraseEntry'}},
                        },
                    },
                ],
            },
            UpdateDictionaryRequest: {
                type: 'object',
                minProperties: 1,
                properties: {
                    label: {type: 'string', maxLength: 100},
                    category: {type: 'string', maxLength: 100},
                    status: {type: 'string', enum: ['published', 'draft', 'archived']},
                    entries: {
                        type: 'array',
                        minItems: 1,
                        description: '内容条目结构必须与题库现有 kind 匹配。',
                        items: {oneOf: [{$ref: '#/components/schemas/WordEntry'}, {$ref: '#/components/schemas/PhraseEntry'}]},
                    },
                },
            },
            DictionaryIdValue: {
                type: 'string',
                pattern: '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$',
            },
        },
    },
} as const;
