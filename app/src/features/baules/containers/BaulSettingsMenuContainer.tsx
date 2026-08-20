import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, MoreVertical, Share2, User } from 'lucide-react';
import { IconButton } from '@/design-system/components/actions/IconButton';
import { InviteFamilyModal } from '@/features/sharing/components/InviteFamilyModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/design-system/components/ui/dropdown-menu';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';
import { Baul } from '@/types';
import { getBaulPermissions } from '@/utils/roleUtils';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useUIStore } from '@/store/uiStore';
import { api } from '@/api';

interface BaulSettingsMenuContainerProps {
  baul: Baul;
}

// Self-sufficient "···" menu: owns the invite-link action and its modal end to end, and
// navigates to the "Ajustes del baúl"/"Mi cuenta"/"Ayuda" screens — those own their own state
// past the navigation (see BaulSettingsRoute, MyAccountRoute, HelpSupportRoute) — so BaulRoute
// (its only caller) doesn't need to know any of this exists beyond mounting this in its
// header's trailing slot. "Mi cuenta"/"Ayuda" are visible to every authenticated user (not
// gated by baúl permissions), so the trigger itself is never hidden.
export function BaulSettingsMenuContainer({ baul }: BaulSettingsMenuContainerProps) {
  const navigate = useNavigate();
  const { removalRequests } = usePersonasStore();
  const showToastMessage = useUIStore((state) => state.showToastMessage);
  const permissions = getBaulPermissions(baul);
  const pendingRemovalRequestsCount = (removalRequests[baul.id] || []).filter((r) => r.status === 'pending').length;

  const [showInviteFamilyModal, setShowInviteFamilyModal] = useState(false);

  const canManageInvite = permissions.canManageBaulInvite;
  const canReviewRemovalRequests = pendingRemovalRequestsCount > 0;
  const canManageBaulSettings =
    permissions.canSetBaulCover ||
    permissions.canEditBaul ||
    canReviewRemovalRequests ||
    permissions.canRequestBaulDeletion;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton aria-label="Opciones del baúl">
            <MoreVertical className="w-5 h-5" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {canManageInvite && (
            <DropdownMenuItem onClick={() => setShowInviteFamilyModal(true)}>
              <Share2 className="w-4 h-4 mr-2" />
              Invitar a la familia
            </DropdownMenuItem>
          )}

          {canManageInvite && canManageBaulSettings && <DropdownMenuSeparator />}

          {canManageBaulSettings && (
            <DropdownMenuItem onClick={() => navigate(`/baules/${baul.id}/ajustes`)}>
              <BaulIcon className="w-4 h-4 mr-2" />
              <span>Ajustes del baúl</span>
              {canReviewRemovalRequests && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />}
            </DropdownMenuItem>
          )}

          {(canManageInvite || canManageBaulSettings) && <DropdownMenuSeparator />}

          <DropdownMenuItem onClick={() => navigate('/cuenta')}>
            <User className="w-4 h-4 mr-2" />
            Mi cuenta
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => navigate('/ayuda')}>
            <HelpCircle className="w-4 h-4 mr-2" />
            Ayuda
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showInviteFamilyModal && (
        <InviteFamilyModal
          baulName={baul.name}
          fetchLink={() => api.baules.getInviteLink(baul.id)}
          onRegenerate={() => api.baules.regenerateInviteLink(baul.id)}
          onCancel={() => setShowInviteFamilyModal(false)}
          onToast={showToastMessage}
        />
      )}
    </>
  );
}
