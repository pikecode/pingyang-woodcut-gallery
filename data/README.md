# Gallery data

`gallery.sqlite` is the normalized catalog database. `raw/artworks.json`
preserves the fields exactly as extracted from the source document, while
`exports/artworks.json` is a frontend-oriented export. The standalone
`exports/image-manifest.json` contains the paths, byte sizes, and hashes needed
to migrate original images to object storage.

Rebuild all generated data and extract the original images with:

```sh
python3 -m pip install -r requirements.txt
python3 scripts/import_gallery.py
```

The source document does not specify a dimension unit. Numeric dimensions are
stored as presumed centimeters with `unit_verified = false` until the museum
confirms them. Editorial conflicts and suspected transcription errors are kept
in the `data_issues` table; source descriptions are not silently corrected.
