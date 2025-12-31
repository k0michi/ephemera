import ArrayHelper from "@ephemera/shared/lib/array_helper";

export interface SelectFileOptions {
  accept?: string;
}

export default class FileHelper {
  static downloadFile(data: string, filename: string, type: string) {
    const file = new Blob([data], { type });
    const a = document.createElement("a");
    a.style.display = 'none';
    const url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static selectFile(options: SelectFileOptions = {}): Promise<File> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options.accept || '';
      input.style.display = 'none';

      input.onchange = (event) => {
        const target = event.target as HTMLInputElement;

        if (target.files) {
          resolve(ArrayHelper.strictGet(target.files, 0));
        } else {
          // Never happens
          reject(new Error('No files selected'));
        }
      };

      input.oncancel = (event) => {
        reject(new Error('Cancelled'));
      };

      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    });
  }
}