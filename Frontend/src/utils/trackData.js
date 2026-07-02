// Normalizes a `track_data.tracking` object from the read API shape into the
// shape accepted by the write validation (organization/update-feature-new and
// settings/user-tracking-setting share the same Joi schema).
//
// The org/employee "read" endpoints return tracking sub-fields in shapes the
// "write" validation rejects, so round-tripping the rules (read -> POST back)
// fails:
//   - networkBased: read returns { networkName, networkMac }, but the write
//     schema allows only { networkName, ipAddress, officeNetwork } and rejects
//     unknown keys ("networkMac" is not allowed). `ipAddress` accepts a MAC on
//     the backend, so networkMac maps onto it.
//   - projectBased / geoLocation: read returns {} when empty, but the write
//     schema requires arrays ("projectBased" must be an array).

const normalizeNetworkEntry = (n = {}) => {
    const entry = {
        networkName: n.networkName ?? n.NetworkName ?? null,
        ipAddress: n.ipAddress ?? n.networkMac ?? n.MACaddress ?? null,
    };
    if (n.officeNetwork !== undefined) entry.officeNetwork = n.officeNetwork;
    return entry;
};

const normalizeNetworkBased = (networkBased) => {
    if (Array.isArray(networkBased)) return networkBased.map(normalizeNetworkEntry);
    if (networkBased && typeof networkBased === "object") return normalizeNetworkEntry(networkBased);
    return networkBased;
};

// Coerce a field the schema requires to be an array. The read API returns `{}`
// for empty lists; populated lists already arrive as arrays.
const toTrackingArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return Object.values(value).filter((v) => v && typeof v === "object");
    return [];
};

export const normalizeTrackingForSave = (tracking) => {
    if (!tracking || typeof tracking !== "object") return tracking;
    const out = { ...tracking };
    if ("networkBased" in out) out.networkBased = normalizeNetworkBased(out.networkBased);
    if ("projectBased" in out) out.projectBased = toTrackingArray(out.projectBased);
    if ("geoLocation" in out) out.geoLocation = toTrackingArray(out.geoLocation);
    return out;
};

// Normalizes payload.track_data.tracking in place-safe (immutable) fashion.
export const sanitizeTrackDataPayload = (payload) => {
    const tracking = payload?.track_data?.tracking;
    if (!tracking) return payload;
    return {
        ...payload,
        track_data: {
            ...payload.track_data,
            tracking: normalizeTrackingForSave(tracking),
        },
    };
};
