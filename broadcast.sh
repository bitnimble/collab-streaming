file="$1"

if [[ $file == *.mkv ]]
then
        ffmpeg -re -i $file -vf subtitles=$file -c:v libx264 -c:a aac -strict -2 -f flv rtmp://localhost/stream/index
else
        ffmpeg -re -i $file -c:v libx264 -c:a aac -strict -2 -f flv rtmp://localhost/stream/index
fi
