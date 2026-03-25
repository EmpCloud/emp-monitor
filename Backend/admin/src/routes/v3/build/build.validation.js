'use strict';
const Joi = require('@hapi/joi');

class BuildValidator {
    validateBuildInfoParams() {
        return Joi.object({
            organization_key: Joi.string().trim().required(),
            build_version: Joi.string().trim().required(),
            type: Joi.string().trim().required(),
            mode: Joi.string().trim().required().valid('office', 'personal'),
            url: Joi.string().uri().required(),
        }).required();
    }

    createBuild() {
        return Joi.object({
            email: Joi.string().trim().required(),
        }).required();
    }
    addOnPremiseBuild() {
        return Joi.object({
            email: Joi.string().email().required(),
            organization_key: Joi.string().trim().required(),
            build_version: Joi.string().trim().required(),
            type: Joi.string().trim().required(),
            mode: Joi.string().trim().required().valid('office', 'personal'),
            url: Joi.string().uri().required(),
        }).required();
    }
}

module.exports = new BuildValidator;