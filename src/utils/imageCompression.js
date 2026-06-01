export const compressImage = (file, maxWidth = 500, quality = 0.6) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress and convert to base64 jpeg
        const base64 = canvas.toDataURL('image/jpeg', quality);
        
        // Log approximate size
        console.log(`Compressed size: ~${Math.round(base64.length / 1024)} KB`);
        
        // If it's still too large (close to 50k chars), compress more aggressively
        if (base64.length > 45000) {
           const recompressed = canvas.toDataURL('image/jpeg', quality - 0.2);
           resolve(recompressed);
        } else {
           resolve(base64);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
