import * as zlib from 'zlib';

export interface ZipFileInput {
    path: string;
    content: string | Buffer;
}

/**
 * Computes standard IEEE 802.3 CRC-32 checksum for a Buffer.
 */
export function computeCrc32(buf: Buffer): number {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[i] = c;
    }
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
}

/**
 * Creates a standard PKZIP (.zip) buffer from an array of files.
 * Compatible with Windows Explorer right-click extract, PowerShell Expand-Archive,
 * 7-Zip, Linux unzip, and macOS Archive Utility.
 */
export function createZipBuffer(files: ZipFileInput[]): Buffer {
    const localHeaders: Buffer[] = [];
    const centralDirs: Buffer[] = [];
    let offset = 0;

    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

    for (const f of files) {
        if (!f.path) continue;
        const cleanPath = f.path.replace(/\\/g, '/').replace(/^\/+/, '');
        if (!cleanPath) continue;

        const nameBuf = Buffer.from(cleanPath, 'utf8');
        const contentBuf = Buffer.isBuffer(f.content)
            ? f.content
            : Buffer.from(f.content !== undefined && f.content !== null ? f.content : '', 'utf8');

        const crc = computeCrc32(contentBuf);
        const compressed = zlib.deflateRawSync(contentBuf);

        // Local file header (30 bytes + nameBuf.length + compressed.length)
        const lh = Buffer.alloc(30);
        lh.writeUInt32LE(0x04034b50, 0); // signature: PK\x03\x04
        lh.writeUInt16LE(20, 4);         // version needed: 2.0
        lh.writeUInt16LE(0x0800, 6);     // general purpose bit flag: UTF-8 filename (bit 11)
        lh.writeUInt16LE(8, 8);          // compression method: 8 = Deflate
        lh.writeUInt16LE(dosTime, 10);   // last mod file time
        lh.writeUInt16LE(dosDate, 12);   // last mod file date
        lh.writeUInt32LE(crc, 14);       // crc-32
        lh.writeUInt32LE(compressed.length, 18); // compressed size
        lh.writeUInt32LE(contentBuf.length, 22); // uncompressed size
        lh.writeUInt16LE(nameBuf.length, 26);    // file name length
        lh.writeUInt16LE(0, 28);                 // extra field length

        localHeaders.push(lh, nameBuf, compressed);

        // Central directory header (46 bytes + nameBuf.length)
        const cd = Buffer.alloc(46);
        cd.writeUInt32LE(0x02014b50, 0); // signature: PK\x01\x02
        cd.writeUInt16LE(20, 4);         // version made by (2.0)
        cd.writeUInt16LE(20, 6);         // version needed to extract (2.0)
        cd.writeUInt16LE(0x0800, 8);     // general purpose bit flag: UTF-8
        cd.writeUInt16LE(8, 10);         // compression method: Deflate
        cd.writeUInt16LE(dosTime, 12);
        cd.writeUInt16LE(dosDate, 14);
        cd.writeUInt32LE(crc, 16);
        cd.writeUInt32LE(compressed.length, 20);
        cd.writeUInt32LE(contentBuf.length, 24);
        cd.writeUInt16LE(nameBuf.length, 28);
        cd.writeUInt16LE(0, 30);         // extra field length
        cd.writeUInt16LE(0, 32);         // file comment length
        cd.writeUInt16LE(0, 34);         // disk number start
        cd.writeUInt16LE(0, 36);         // internal file attributes
        cd.writeUInt32LE((0o100644 << 16) >>> 0, 38); // external file attributes: regular file permissions
        cd.writeUInt32LE(offset, 42);    // relative offset of local header

        centralDirs.push(cd, nameBuf);

        offset += lh.length + nameBuf.length + compressed.length;
    }

    const cdOffset = offset;
    const cdBuf = Buffer.concat(centralDirs);
    const cdSize = cdBuf.length;

    // End of central directory record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // signature: PK\x05\x06
    eocd.writeUInt16LE(0, 4);          // number of this disk
    eocd.writeUInt16LE(0, 6);          // number of the disk with start of central directory
    eocd.writeUInt16LE(files.length, 8); // total number of entries in central directory on this disk
    eocd.writeUInt16LE(files.length, 10); // total number of entries in central directory
    eocd.writeUInt32LE(cdSize, 12);    // size of central directory
    eocd.writeUInt32LE(cdOffset, 16);  // offset of start of central directory
    eocd.writeUInt16LE(0, 20);         // .ZIP file comment length

    return Buffer.concat([...localHeaders, cdBuf, eocd]);
}
