import { Share } from '@capacitor/share';

export async function sharePublicLink({
  title,
  text,
  url,
  onCopied,
}: {
  title: string;
  text: string;
  url: string;
  onCopied: () => void;
}) {
  try {
    await Share.share({ title, text, url });
  } catch (error) {
    if ((error as Error).name === 'AbortError') return;
    console.error('Error sharing public link:', error);
    await navigator.clipboard.writeText(url);
    onCopied();
  }
}
