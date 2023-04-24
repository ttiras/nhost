import { calculateApproximateCost } from '@/features/settings/resources/utils/calculateApproximateCost';
import { getAllocatedResources } from '@/features/settings/resources/utils/getAllocatedResources';
import { prettifyMemory } from '@/features/settings/resources/utils/prettifyMemory';
import { prettifyVCPU } from '@/features/settings/resources/utils/prettifyVCPU';
import type { ResourceSettingsFormValues } from '@/features/settings/resources/utils/resourceSettingsValidationSchema';
import {
  MAX_TOTAL_VCPU,
  MIN_TOTAL_VCPU,
} from '@/features/settings/resources/utils/resourceSettingsValidationSchema';
import { useProPlan } from '@/hooks/common/useProPlan';
import { Alert } from '@/ui/Alert';
import Box from '@/ui/v2/Box';
import Slider, { sliderClasses } from '@/ui/v2/Slider';
import Text from '@/ui/v2/Text';
import ArrowRightIcon from '@/ui/v2/icons/ArrowRightIcon';
import {
  RESOURCE_MEMORY_MULTIPLIER,
  RESOURCE_VCPU_MEMORY_RATIO,
  RESOURCE_VCPU_MULTIPLIER,
  RESOURCE_VCPU_PRICE,
  RESOURCE_VCPU_STEP,
} from '@/utils/CONSTANTS';
import { alpha, styled } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';

export interface TotalResourcesFormFragmentProps {
  /**
   * The initial price of the resources.
   */
  initialPrice: number;
}

const StyledAvailableCpuSlider = styled(Slider)(({ theme }) => ({
  [`& .${sliderClasses.rail}`]: {
    backgroundColor: alpha(theme.palette.primary.main, 0.15),
  },
}));

export default function TotalResourcesFormFragment({
  initialPrice,
}: TotalResourcesFormFragmentProps) {
  const {
    data: proPlan,
    error: proPlanError,
    loading: proPlanLoading,
  } = useProPlan();
  const { setValue } = useFormContext<ResourceSettingsFormValues>();
  const formValues = useWatch<ResourceSettingsFormValues>();

  if (!proPlan && !proPlanLoading) {
    return (
      <Alert severity="error">
        Couldn&apos;t load the plan for this projectee. Please try again.
      </Alert>
    );
  }

  if (proPlanError) {
    throw proPlanError;
  }

  const priceForTotalAvailableVCPU =
    (RESOURCE_VCPU_PRICE * formValues.totalAvailableVCPU) /
    RESOURCE_VCPU_MULTIPLIER;

  const priceForServicesAndReplicas = calculateApproximateCost(
    RESOURCE_VCPU_PRICE,
    {
      replicas: formValues.database?.replicas,
      vcpu: formValues.database?.vcpu,
    },
    {
      replicas: formValues.hasura?.replicas,
      vcpu: formValues.hasura?.vcpu,
    },
    {
      replicas: formValues.auth?.replicas,
      vcpu: formValues.auth?.vcpu,
    },
    {
      replicas: formValues.storage?.replicas,
      vcpu: formValues.storage?.vcpu,
    },
  );

  const updatedPrice =
    Math.max(priceForTotalAvailableVCPU, priceForServicesAndReplicas) +
    proPlan.price;

  const { vcpu: allocatedVCPU, memory: allocatedMemory } =
    getAllocatedResources(formValues);
  const remainingVCPU = formValues.totalAvailableVCPU - allocatedVCPU;
  const remainingMemory = formValues.totalAvailableMemory - allocatedMemory;
  const hasUnusedResources = remainingVCPU > 0 || remainingMemory > 0;
  const hasOverallocatedResources = remainingVCPU < 0 || remainingMemory < 0;

  const unusedResourceMessage = [
    remainingVCPU > 0 ? `${prettifyVCPU(remainingVCPU)} vCPUs` : '',
    remainingMemory > 0 ? `${prettifyMemory(remainingMemory)} of Memory` : '',
  ]
    .filter(Boolean)
    .join(' and ');

  const overallocatedResourceMessage = [
    remainingVCPU < 0 ? `${prettifyVCPU(-remainingVCPU)} vCPUs` : '',
    remainingMemory < 0 ? `${prettifyMemory(-remainingMemory)} of Memory` : '',
  ]
    .filter(Boolean)
    .join(' and ');

  function handleVCPUChange(value: string) {
    const updatedVCPU = parseFloat(value);
    const updatedMemory =
      (updatedVCPU / RESOURCE_VCPU_MULTIPLIER) *
      RESOURCE_VCPU_MEMORY_RATIO *
      RESOURCE_MEMORY_MULTIPLIER;

    if (Number.isNaN(updatedVCPU) || updatedVCPU < MIN_TOTAL_VCPU) {
      return;
    }

    setValue('totalAvailableVCPU', updatedVCPU, { shouldDirty: true });
    setValue('totalAvailableMemory', updatedMemory, { shouldDirty: true });
  }

  return (
    <Box className="px-4 pb-4">
      <Box className="rounded-md border">
        <Box className="flex flex-col gap-4 bg-transparent p-4">
          <Box className="flex flex-row items-center justify-between gap-4">
            <Text color="secondary">
              Total available compute for your project:
            </Text>

            {initialPrice !== updatedPrice && (
              <Text className="flex flex-row items-center justify-end gap-2">
                <Text component="span" color="secondary">
                  ${initialPrice.toFixed(2)}/mo
                </Text>
                <ArrowRightIcon />
                <Text component="span" className="font-medium">
                  ${updatedPrice.toFixed(2)}/mo
                </Text>
              </Text>
            )}
          </Box>

          <Box className="flex flex-row items-center justify-start gap-4">
            <Text color="secondary">
              vCPUs:{' '}
              <Text component="span" color="primary" className="font-medium">
                {prettifyVCPU(formValues.totalAvailableVCPU)}
              </Text>
            </Text>

            <Text color="secondary">
              Memory:{' '}
              <Text component="span" color="primary" className="font-medium">
                {prettifyMemory(formValues.totalAvailableMemory)}
              </Text>
            </Text>
          </Box>

          <StyledAvailableCpuSlider
            value={formValues.totalAvailableVCPU}
            onChange={(_event, value) => handleVCPUChange(value.toString())}
            max={MAX_TOTAL_VCPU}
            step={RESOURCE_VCPU_STEP}
            aria-label="Total Available vCPU"
          />
        </Box>

        <Alert
          severity={
            hasUnusedResources || hasOverallocatedResources ? 'warning' : 'info'
          }
          className="grid grid-flow-row gap-2 rounded-t-none rounded-b-[5px] text-left"
        >
          {hasUnusedResources && !hasOverallocatedResources && (
            <>
              <strong>Please use all the available vCPUs and Memory</strong>

              <p>
                You have {unusedResourceMessage} unused. Allocate it to any of
                the services before saving.
              </p>
            </>
          )}

          {hasOverallocatedResources && (
            <>
              <strong>Overallocated Resources</strong>

              <p>
                You have {overallocatedResourceMessage} overallocated. Reduce it
                before saving or increase the total amount.
              </p>
            </>
          )}

          {!hasUnusedResources && !hasOverallocatedResources && (
            <>
              <strong>You&apos;re All Set</strong>

              <p>
                You have successfully allocated all the available vCPUs and
                Memory.
              </p>
            </>
          )}
        </Alert>
      </Box>
    </Box>
  );
}
