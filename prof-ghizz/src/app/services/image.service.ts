import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ImageService {
  async compressAndConvertToBase64(
    file: File,
    maxSizeKB = 1000,
    size = 256
  ): Promise<string> {
    const img = document.createElement('img');
    const reader = new FileReader();

    return new Promise<string>((resolve, reject) => {
      reader.onload = (e: any) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Comprime per stare sotto maxSizeKB
          let quality = 0.8;
          let base64 = canvas.toDataURL('image/jpeg', quality);
          while (base64.length / 1024 > maxSizeKB && quality > 0.1) {
            quality -= 0.05;
            base64 = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(base64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}