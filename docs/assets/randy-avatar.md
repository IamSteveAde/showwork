# Randy avatar

Created using the built-in image-generation tool, then resized and encoded to WebP with Sharp (192 × 192, quality 86). The original generated PNG is retained beside the web asset. The shared RandyAvatar component uses the optimized local asset in the floating help assistant and workspace Randy.

Assets:
- `public/images/randy/avatar.webp`
- `public/images/randy/avatar-source.png`

Generation prompt:

> Create one polished app avatar for Randy, Showwork's fictional AI assistant. A friendly Nigerian Black man aged about 25, warm deep brown skin, short neatly tapered natural black hair, softly defined features, warm brown eyes, subtle well-groomed short facial hair, relaxed confident smile. Face only, front facing, no shoulders or torso, no clothing or headwear. Premium contemporary 3D illustrated character portrait, tasteful and human, clean contours with soft studio lighting, expressive but not exaggerated. Center the whole head with generous margin suitable for a circular crop at 24 to 60 pixels. Plain pale blue background matching a modern blue software product. No text, letters, logos, icons, accessories or watermark. Deliver a square image. Save the result as a local generated image so it can be used in the project.

The floating assistant's Minimize control closes the dialog while retaining messages and the draft in component state. The face bubble reopens the same chat. Navigation still resets help context as before; minimizing does not persist a transcript across reloads. The business workspace uses the same face, without merging private business chat with public help chat.
