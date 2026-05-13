const fs = require('fs');
const path = require('path');

const sendResponse = require('../../../utils/myService').sendResponse;
const BuildModel = require('./Build.model');
const { organizationBuildMessages } = require("../../../utils/helpers/LanguageTranslate")

const SELF_HOSTED_BUILD_VERSION = process.env.SELF_HOSTED_AGENT_BUILD_VERSION || 'self-hosted';
const SELF_HOSTED_SETUP_MESSAGE =
    process.env.SELF_HOSTED_AGENT_SETUP_MESSAGE ||
    'Stealth and revealed agent installers are not configured on this self-hosted deployment yet. This open-source repo does not include the desktop agent binaries.';
const AGENT_PUBLIC_ROOT = path.join(__dirname, '../../../../public/agents');
const LOCAL_BUILD_CANDIDATES = [
    {
        type: 'win64',
        mode: 'office',
        paths: [
            'windows/office/agent-office-x64.msi',
            'windows/office/agent-x64.msi',
            'windows/office/agent.msi',
            'windows/office/EmpMonitor.zip',
            'windows/office/empmonitor.zip',
            'windows/agent-office-x64.msi',
            'windows/agent-office.msi',
            'agent-office-x64.msi',
        ],
    },
    {
        type: 'win86',
        mode: 'office',
        paths: [
            'windows/office/agent-office-x86.msi',
            'windows/office/agent-x86.msi',
            'windows/agent-office-x86.msi',
            'agent-office-x86.msi',
        ],
    },
    {
        type: 'win64',
        mode: 'personal',
        paths: [
            'windows/personal/agent-personal-x64.msi',
            'windows/personal/agent-x64.msi',
            'windows/personal/agent.msi',
            'windows/personal/EmpMonitor.zip',
            'windows/personal/empmonitor.zip',
            'windows/agent-personal-x64.msi',
            'windows/agent-personal.msi',
            'agent-personal-x64.msi',
        ],
    },
    {
        type: 'win86',
        mode: 'personal',
        paths: [
            'windows/personal/agent-personal-x86.msi',
            'windows/personal/agent-x86.msi',
            'windows/agent-personal-x86.msi',
            'agent-personal-x86.msi',
        ],
    },
    {
        type: 'mac',
        mode: 'office',
        paths: [
            'mac/office/empmonitor-mac.zip',
            'mac/office/EmpMonitor.zip',
            'mac/office/agent.zip',
            'mac/agent-office.zip',
            'agent-office-mac.zip',
        ],
    },
    {
        type: 'mac-arm',
        mode: 'office',
        paths: [
            'mac/office/agent-office-arm.pkg',
            'mac/office/agent-office-arm.dmg',
            'mac/office/agent-arm.pkg',
            'mac/office/agent-arm.dmg',
            'mac/office/agent.pkg',
            'mac/office/agent.dmg',
            'mac/agent-office-arm.pkg',
            'mac/agent-office-arm.dmg',
            'agent-office-arm.pkg',
            'agent-office-arm.dmg',
        ],
    },
    {
        type: 'mac-intel',
        mode: 'office',
        paths: [
            'mac/office/agent-office-intel.pkg',
            'mac/office/agent-office-intel.dmg',
            'mac/office/agent-intel.pkg',
            'mac/office/agent-intel.dmg',
            'mac/agent-office-intel.pkg',
            'mac/agent-office-intel.dmg',
            'agent-office-intel.pkg',
            'agent-office-intel.dmg',
        ],
    },
    {
        type: 'mac-arm',
        mode: 'personal',
        paths: [
            'mac/personal/agent-personal-arm.pkg',
            'mac/personal/agent-personal-arm.dmg',
            'mac/personal/agent-arm.pkg',
            'mac/personal/agent-arm.dmg',
            'mac/personal/agent.pkg',
            'mac/personal/agent.dmg',
            'mac/agent-personal-arm.pkg',
            'mac/agent-personal-arm.dmg',
            'agent-personal-arm.pkg',
            'agent-personal-arm.dmg',
        ],
    },
    {
        type: 'mac',
        mode: 'personal',
        paths: [
            'mac/personal/empmonitor-mac.zip',
            'mac/personal/EmpMonitor.zip',
            'mac/personal/agent.zip',
            'mac/agent-personal.zip',
            'agent-personal-mac.zip',
        ],
    },
    {
        type: 'mac-intel',
        mode: 'personal',
        paths: [
            'mac/personal/agent-personal-intel.pkg',
            'mac/personal/agent-personal-intel.dmg',
            'mac/personal/agent-intel.pkg',
            'mac/personal/agent-intel.dmg',
            'mac/agent-personal-intel.pkg',
            'mac/agent-personal-intel.dmg',
            'agent-personal-intel.pkg',
            'agent-personal-intel.dmg',
        ],
    },
    {
        type: 'linux',
        mode: 'office',
        paths: [
            'linux/office/agent-office.run',
            'linux/office/agent.run',
            'linux/agent-office.run',
            'agent-office.run',
        ],
    },
    {
        type: 'linux',
        mode: 'personal',
        paths: [
            'linux/personal/agent-personal.run',
            'linux/personal/agent.run',
            'linux/agent-personal.run',
            'agent-personal.run',
        ],
    },
];

function getPublicBuildUrl(req, relativePath) {
    const normalizedPath = relativePath.split(path.sep).join('/');
    return `${req.protocol}://${req.get('host')}/agents/${normalizedPath}`;
}

function getSelfHostedBuilds(req, organizationId) {
    if (!fs.existsSync(AGENT_PUBLIC_ROOT)) return [];

    const builds = [];
    const seen = new Set();

    for (const candidate of LOCAL_BUILD_CANDIDATES) {
        const relativePath = candidate.paths.find((item) =>
            fs.existsSync(path.join(AGENT_PUBLIC_ROOT, item))
        );

        if (!relativePath) continue;

        const fileType = path.extname(relativePath) || '';
        const key = `${candidate.mode}:${candidate.type}:${fileType}`;
        if (seen.has(key)) continue;

        seen.add(key);
        builds.push({
            id: `local-${candidate.mode}-${candidate.type}-${path.basename(relativePath)}`,
            organizations_id: organizationId,
            build_version: SELF_HOSTED_BUILD_VERSION,
            type: candidate.type,
            mode: candidate.mode,
            url: getPublicBuildUrl(req, relativePath),
            file_type: fileType,
        });
    }

    return builds;
}

function mergeBuilds(primaryBuilds, fallbackBuilds) {
    const merged = [...primaryBuilds];
    const existingKeys = new Set(
        primaryBuilds.map((item) => `${item.mode}:${item.type}:${item.file_type}`)
    );

    for (const build of fallbackBuilds) {
        const key = `${build.mode}:${build.type}:${build.file_type}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        merged.push(build);
    }

    return merged;
}


class BuildController {
    async getBuild(req, res) {
        const organization_id = req.decoded.organization_id;
        const language = req.decoded.language;

        try {
            const dbBuilds = await BuildModel.getOrgBuild(organization_id);
            const selfHostedBuilds = getSelfHostedBuilds(req, organization_id);
            const builds = mergeBuilds(dbBuilds, selfHostedBuilds);
            const missingBuildModes = ['office', 'personal'].filter(
                (mode) => !builds.some((build) => build.mode === mode)
            );
            const newBuildFlag = builds.some(
                (build) => build.type === "mac-arm" || build.type === "mac-intel"
            );

            return sendResponse(
                res,
                builds.length ? 200 : 400,
                {
                    builds,
                    newBuildFlag,
                    setupRequired: builds.length === 0,
                    missingBuildModes,
                    setupMessage: missingBuildModes.length ? SELF_HOSTED_SETUP_MESSAGE : null,
                },
                (
                    builds.length
                        ? organizationBuildMessages.find(x => x.id === "3")[language]
                        : organizationBuildMessages.find(x => x.id === "1")[language]
                ) || (
                    builds.length
                        ? organizationBuildMessages.find(x => x.id === "3")["en"]
                        : organizationBuildMessages.find(x => x.id === "1")["en"]
                ),
                null
            );
        } catch (err) {
            console.log(err)
            return sendResponse(res, 400, null, organizationBuildMessages.find(x => x.id === "4")[language] || organizationBuildMessages.find(x => x.id === "4")["en"], null);
        }

    }

    async getBuildOnPremise(req, res) {
        const email = req.query.email;
        const language = 'en';

        try {
            const get_build = await BuildModel.getOrgBuildOnPremise(email);
            if (get_build.length == 0) {
                return sendResponse(res, 400, null, organizationBuildMessages.find(x => x.id === "1")[language] || organizationBuildMessages.find(x => x.id === "1")["en"], null);
            } else {
                return sendResponse(res, 200, get_build, organizationBuildMessages.find(x => x.id === "3")[language] || organizationBuildMessages.find(x => x.id === "3")["en"], null);
            }
        } catch (err) {
            return sendResponse(res, 400, null, organizationBuildMessages.find(x => x.id === "4")[language] || organizationBuildMessages.find(x => x.id === "4")["en"], null);
        }
    }
}
module.exports = new BuildController;
