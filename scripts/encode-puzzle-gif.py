import json
from PIL import Image

frames = json.load(open('../puzzle-gif-frames/frames.json'))
images = [Image.open(frame['path']).convert('RGB') for frame in frames]
palette = images[0].quantize(colors=128)
images = [image.quantize(palette=palette, dither=Image.Dither.NONE) for image in images]
images[0].save('worker/posters/puzzle-patterns.gif', save_all=True,
               append_images=images[1:], duration=[frame['duration'] for frame in frames],
               loop=0, optimize=True, disposal=2)
Image.open(frames[0]['path']).save('worker/posters/puzzle-patterns.png')
with Image.open('worker/posters/puzzle-patterns.gif') as gif:
    assert gif.n_frames == len(frames)
    print(f'Encoded {gif.n_frames} frames; full loop {sum(f["duration"] for f in frames)/1000:.1f}s.')
