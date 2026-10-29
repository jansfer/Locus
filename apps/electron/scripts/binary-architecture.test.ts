import { expect, test } from 'bun:test'
import { createRequire } from 'node:module'
const { binaryArchitecture } = createRequire(import.meta.url)('./binary-architecture.cjs') as { binaryArchitecture(header: Buffer): string }

test('Given PE、ELF 与 Mach-O 文件头 When 检查 Then 正确区分两种 CPU 并拒绝未知格式', () => {
  for (const [arch, pe, elf, mach] of [['x64', 0x8664, 62, 0x01000007], ['arm64', 0xaa64, 183, 0x0100000c]] as const) {
    const header = Buffer.alloc(256)
    header.write('MZ'); header.writeUInt32LE(128, 0x3c); header.writeUInt32LE(0x4550, 128); header.writeUInt16LE(pe, 132)
    expect(binaryArchitecture(header)).toBe(arch)
    header.fill(0); header.set([0x7f, 0x45, 0x4c, 0x46]); header.writeUInt16LE(elf, 18)
    expect(binaryArchitecture(header)).toBe(arch)
    header.fill(0); header.writeUInt32LE(0xfeedfacf, 0); header.writeUInt32LE(mach, 4)
    expect(binaryArchitecture(header)).toBe(arch)
  }
  expect(() => binaryArchitecture(Buffer.alloc(256))).toThrow()
})
