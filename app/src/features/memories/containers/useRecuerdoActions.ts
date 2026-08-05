import { api } from '@/api';
import { Recuerdo } from '@/types';
import { editRecuerdo as editRecuerdoUseCase } from '@/features/memories/useCases';
import { sharePublicLink } from '@/features/sharing/sharePublicLink';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useUIStore } from '@/store/uiStore';

// Shared by RecuerdosTabContainer and ChapterRecuerdosFeedContainer — identical logic used to
// be duplicated verbatim in BaulRoute and ChapterRoute. Not exported outside containers/: it's
// an implementation detail of those two, not a general-purpose memories API.
export function useRecuerdoActions(baulName: string) {
  const { run } = useAsyncAction();
  const showToastMessage = useUIStore((state) => state.showToastMessage);

  const editRecuerdo = async (recuerdo: Recuerdo, text: string): Promise<boolean> => {
    const result = await run(() => editRecuerdoUseCase(recuerdo.id, text), {
      successMessage: 'Recuerdo actualizado',
      errorMessage: 'Error al guardar el recuerdo',
    });
    return result.ok;
  };

  const shareRecuerdo = async (recuerdo: Recuerdo) => {
    const result = await run(() => api.recuerdos.createShareLink(recuerdo.id), {
      key: 'share-recuerdo',
      errorMessage: 'Error al crear el enlace',
    });
    if (!result.ok) return;

    await sharePublicLink({
      title: `Recuerdo de ${baulName}`,
      text: `Te comparto un recuerdo de "${baulName}" en El Baúl.`,
      url: result.value.url,
      onCopied: () => showToastMessage('Enlace copiado al portapapeles'),
    });
  };

  return { editRecuerdo, shareRecuerdo };
}
