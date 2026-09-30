function asBuffer(value: Buffer | string) {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  const normalized = value.startsWith("0x") ? value.slice(2) : value;
  const isHex = /^[0-9a-fA-F]+$/.test(normalized) && normalized.length % 2 === 0;
  return isHex
    ? Buffer.from(normalized, "hex")
    : Buffer.from(value, "utf8");
}

function pushDataOpcode(length: number) {
  if (length <= 75) {
    return Buffer.from([length]);
  }

  if (length <= 0xff) {
    return Buffer.from([0x4c, length]);
  }

  throw new Error("OP_RETURN payload is too large");
}

export function buildOpReturnScript(commitment: Buffer | string) {
  const data = asBuffer(commitment);
  return Buffer.concat([
    Buffer.from([0x6a]),
    pushDataOpcode(data.length),
    data,
  ]).toString("hex");
}
