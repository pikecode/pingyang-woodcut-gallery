# Original images

This directory contains the byte-for-byte image payloads extracted from the
legacy Word document. The images are deliberately ignored by Git because they
will be moved to external storage later.

Files are grouped by stable artwork slug:

```text
py-001/01-primary.jpg
py-089/01-part-1.tif
py-089/02-part-2.tif
```

The relative path, source block, dimensions, format, byte size, and SHA-256
digest for every file are recorded in `data/gallery.sqlite` and
`data/exports/artworks.json`.

