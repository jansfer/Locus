const { openSync, readSync, closeSync } = require('node:fs')

/** 读取真实文件头，避免 Windows ARM64 的 x64 仿真掩盖混装。 */
function binaryArchitecture(header) {
  if (header[0] === 0x4d && header[1] === 0x5a) {
    const offset = header.readUInt32LE(0x3c)
    if (offset + 6 > header.length || header.readUInt32LE(offset) !== 0x4550) throw new Error('PE 文件头无效')
    const machine = header.readUInt16LE(offset + 4)
    if (machine === 0x8664) return 'x64'
    if (machine === 0xaa64) return 'arm64'
  } else if (header.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) {
    const machine = header.readUInt16LE(18)
    if (machine === 62) return 'x64'
    if (machine === 183) return 'arm64'
  } else if (header.readUInt32LE(0) === 0xfeedfacf) {
    const cpu = header.readUInt32LE(4)
    if (cpu === 0x01000007) return 'x64'
    if (cpu === 0x0100000c) return 'arm64'
  }
  throw new Error('不支持的二进制架构')
}
function assertBinaryArchitecture(filePath, expected) {
  const descriptor = openSync(filePath, 'r')
  try {
    const header = Buffer.alloc(4096)
    const size = readSync(descriptor, header)
    if (size < 64 || binaryArchitecture(header.subarray(0, size)) !== expected) throw new Error(`二进制架构不匹配: ${filePath}/${expected}`)
  } finally { closeSync(descriptor) }
}
module.exports = { binaryArchitecture, assertBinaryArchitecture }
