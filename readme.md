# ol3 builder

A hosted build tool for OpenLayers 3.

Work in progress.

## installation

Dependencies are managed with `npm`:

    npm install

With dependencies installed, you can start the server.

    npm start

When starting the server, new OpenLayers 3 releases will be downloaded.  This may take some time (the server will start immediately, but may be less responsive if your connection is saturated during the downloads).

## configuration

More configuration options to come.  For now, the `config.json` file includes a list of releases.  When a new release comes out, edit `config.json` with the name and URL for the release (archive of complete source, not release artifacts) and restart the server.
