import { useUI } from '@/context/UIContext';
import { useCurrentWorkspaceAndProject } from '@/hooks/v2/useCurrentWorkspaceAndProject';
import { Alert } from '@/ui/Alert';
import Box from '@/ui/v2/Box';
import Button from '@/ui/v2/Button';
import Checkbox from '@/ui/v2/Checkbox';
import Text from '@/ui/v2/Text';
import {
  GetAllWorkspacesAndProjectsDocument,
  useDeleteWorkspaceMutation,
} from '@/utils/__generated__/graphql';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { triggerToast } from '@/utils/toast';
import router from 'next/router';
import { useState } from 'react';

export default function RemoveWorkspaceModal() {
  const [remove, setRemove] = useState(false);
  const { closeDeleteWorkspaceModal } = useUI();

  const [deleteWorkspace, { loading, error: mutationError, client }] =
    useDeleteWorkspaceMutation();

  const { currentWorkspace } = useCurrentWorkspaceAndProject();

  async function handleClick() {
    try {
      await deleteWorkspace({
        variables: {
          id: currentWorkspace.id,
        },
      });
      triggerToast(`Workspace ${currentWorkspace.name} successfully deleted`);
      closeDeleteWorkspaceModal();
    } catch (error) {
      // TODO: Display error to user and use a logging solution
      return;
    }
    await router.push('/');
    await client.refetchQueries({
      include: [GetAllWorkspacesAndProjectsDocument],
    });
  }

  return (
    <Box className="w-modal rounded-lg p-6 text-left">
      <div className="grid grid-flow-row gap-4">
        <div className="grid grid-flow-row gap-1">
          <Text variant="h3" component="h2">
            Delete Workspace
          </Text>

          <Text>There is no way to recover this workspace later.</Text>
        </div>

        <Box className="border-y py-2">
          <Checkbox
            id="accept-remove"
            label={`I'm sure I want to delete ${currentWorkspace.name}`}
            className="py-2"
            checked={remove}
            onChange={(_event, checked) => setRemove(checked)}
            aria-label="Confirm Delete Workspace"
          />
        </Box>

        <div className="grid grid-flow-row gap-2">
          {mutationError && (
            <Alert severity="error">{getErrorMessage(mutationError)}</Alert>
          )}

          <Button
            color="error"
            onClick={handleClick}
            disabled={!remove || !!mutationError}
            className=""
            loading={loading}
          >
            Delete Workspace
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            onClick={closeDeleteWorkspaceModal}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Box>
  );
}
