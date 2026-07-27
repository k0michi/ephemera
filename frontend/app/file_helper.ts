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

  static async selectFile(options: SelectFileOptions = {}): Promise<File | null> {
    const [ok, files] = await this.openFileDialog({ ...options, multiple: false });
    if (!ok) {
      return null;
    }
    return files[0] ?? null;
  }

  static async selectFiles(options: SelectFileOptions = {}): Promise<File[]> {
    const [ok, files] = await this.openFileDialog({ ...options, multiple: true });
    return files;
  }

  private static openFileDialog(
    options: SelectFileOptions & { multiple?: boolean }
  ): Promise<[boolean, File[]]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options.accept ?? '';
      input.multiple = Boolean(options.multiple);
      input.style.display = 'none';

      input.onchange = (event) => {
        const target = event.target as HTMLInputElement;
        resolve([true, target.files ? Array.from(target.files) : []]);
      };

      input.oncancel = () => {
        resolve([false, []]);
      };

      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    });
  }
}