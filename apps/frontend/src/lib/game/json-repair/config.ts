export const JSON_REPAIR_ENABLED = process.env.NODE_ENV === 'development' ||
                                   process.env.ENABLE_JSON_REPAIR === 'true'