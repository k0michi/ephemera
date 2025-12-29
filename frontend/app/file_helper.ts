export interface SelectFileOptions {
  accept?: string;
  multiple?: boolean;
}

export default class FileHelper {
  static downloadFile(data: string, filename: string, type: string) {
    const file = new Blob([data], { type });
    const a = document.createElement("a");
    const url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static selectFile(options: SelectFileOptions = {}): Promise<File[]> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options.accept || '';
      input.multiple = options.multiple || false;

      input.onchange = (event) => {
        const target = event.target as HTMLInputElement;

        if (target.files) {
          resolve(Array.from(target.files));
        } else {
          // Never happens
          reject(new Error('No files selected'));
        }
      };

      input.addEventListener('cancel', () => {
        reject(new Error('Cancelled'));
      });

      input.click();
    });
  }
}