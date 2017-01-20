# collab-streaming
A small document outlining the setup instructions for setting up a video stream for collaborative group watching over the internet.  

It uses:
- ffmpeg for the reencoding (currently is just libx264 and aac into a flv container, and is set to bake subs in if the source file is an \*.mkv)
- nginx for the rtmp server that ffmpeg pipes to
- HLS for the transport scheme (also served via nginx); as such, it can be played back in-browser with a pure JS implementation player (no Flash here!) and over SSL, on a standard nginx route.

The `hls_fragment` variable is currently set to 1 (second), so that's the maximum out-of-sync you'd get between watchers (unless they pause the video and then resume later, but I'll update the player to be better later so that it just reloads on resume). 


# Instructions

### Compiling nginx with nginx-rtmp-module
First, you'll need to install nginx with the rtmp module. Stop and remove any existing nginx installations with
`sudo service nginx stop` and `sudo apt-get remove nginx`. You don't need to (and shouldn't, if you have existing sites) clear out any nginx configuration files, we're only replacing nginx itself.  

Clone [this nginx rtmp module](https://github.com/sergey-dryabzhinsky/nginx-rtmp-module) repo with `git clone https://github.com/sergey-dryabzhinsky/nginx-rtmp-module.git`.  

Then get the latest nginx source with `apt-get source nginx`. `cd` to the directory it created (`nginx-<some version>`).  
Configure it with `sudo ./configure --with-http_ssl_module --add-module=path/to/nginx-rtmp-module`.  
Now compile it with `make` and then `sudo make install`.  

### Installing ffmpeg

You will need to install ffmpeg -- I won't provide instructions here, but there's nothing special to be done. Just google for "install ffmpeg <your platform>" and get it through whatever way you find.  

### Adding the rtmp listener to nginx

Open up `/etc/nginx/nginx.conf` with your favourite editor (with perms). Chuck the following configuration at the very bottom, as its own block:  

```
rtmp {
  server {
    listen 1935;
    chunk_size 4000;
    
    application stream {
      live on;
      
      hls on;
      hls_path /hls/;
      hls_fragment 1;
      hls_playlist_length 60;
      
      deny play all;
    }
  }
}
```

Then open up `/etc/nginx/sites-available/default` (or whatever your setup is if you have customised it).  
You will want to add two routes: one to `try_files` to our html page (in my example below I have it at /watch) with the video player and another route to host our HLS video stream (mine is at /stream).  

```
server {
	listen 80;
	listen [::]:80;

	root /var/www/html/collab-streaming/;

	server_name _;

	location /watch {
		try_files $uri $uri.html =404;
	}

	location /stream {
		proxy_pass http://localhost:12345/;
	}
}

server {
	listen 12345;
	listen [::]:12345;

	root /hls/;
	
	server_name _;
	
	location / {
			add_header 'Cache-Control' 'no-cache';

			types {
				application/vnd.apple.mpegurl m3u8;
			}

		root /hls/;
	}
}
```

The port `12345` doesn't matter here obviously, just so long as it matches. We've only got a separate server block on another port so that we can strip `stream` (or whatever route you chose) from the uri when nginx tries to index into `/hls/`, leaving just "index.m3u8" (see watch.html for what I'm talking about).  

Note: if you aren't editing `/etc/nginx/sites-available/default` and are adding a new config instead, you'll have to symlink it accordingly to `sites-enabled` with `sudo ln -s /etc/nginx/sites-available/<config-name> /etc/nginx/sites-enabled/`.  

Save both files and restart nginx with `sudo service nginx restart`.  

Next, download `watch.html` from this repo and place it at `/var/www/html/collab-streaming/watch.html`.  
Finally, download and run `broadcast.sh` with `./broadcast.sh [path to video file]` to begin the stream. You can now navigate to `http://localhost/watch` to watch your stream.  
  
  
So the overall flow is:  
```source file -> ffmpeg -> streams to nginx rtmp listener at the /stream/index endpoint -> creates hls files at /hls/index.m3u8 and *.ts```  
and  
```web browser -> nginx http /stream/index.m3u8 -> proxies to port 12345/index.m3u8 -> accesses /hls/index.m3u8```
