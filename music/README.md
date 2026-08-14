# Webamp Music Folder

Drop any `.mp3`, `.wav`, `.ogg`, `.m4a`, or `.flac` audio files into this folder (`/music/`).

## How it Works:

1. **Automatic Loading via `playlist.json`**:
   `playlist.json` lists the tracks that Webamp loads on startup.
   
   Example format:
   ```json
   [
     {
       "metaData": {
         "artist": "Your Artist Name",
         "title": "Song Title"
       },
       "url": "music/my-song.mp3"
     },
     {
       "metaData": {
         "artist": "Another Artist",
         "title": "Another Song"
       },
       "url": "music/another-song.mp3"
     }
   ]
   ```

2. **Auto-Scan via CMS**:
   Whenever the CMS server is running, any audio files in `/music/` are automatically scanned and served.

3. **Drag & Drop**:
   You can also drag and drop audio files directly from your computer onto the Webamp window in your browser at any time!
