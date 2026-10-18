import React from 'react'
import { useAuth } from '@/lib/useAuth'
import { useQuestProgress } from '@/lib/progress'
import { CHECKPOINT_STORIES, EPILOGUE_PARAGRAPHS } from '@/lib/story'
import { Skel } from '@/components/common/Skeleton'
import { IcoMap } from '@/components/icons'

export function ClueScreen({ showUnlockedNotice = false }: { showUnlockedNotice?: boolean }) {
  const { user } = useAuth()
  const { currentLocation, currentLocationIndex, isCurrentUnlocked, progress, loading } = useQuestProgress(user?.uid)
  const chapter = CHECKPOINT_STORIES[currentLocationIndex] ?? CHECKPOINT_STORIES[0]
  const questComplete = Boolean(
    currentLocation && currentLocationIndex === 6 && progress?.completedGameIds.includes(currentLocation.id),
  )

  return (
    <div className="screen-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 390, padding: '30px 26px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 19 }}>
          <div className="label-caps" style={{ color: 'rgba(139,188,212,.86)' }}>
            {questComplete ? 'The Lost Legacy' : loading ? 'Incoming Story' : chapter.chapter}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(139,188,212,0.85)', letterSpacing: '0.04em', flexShrink: 0 }}>
            {loading ? 'Checkpoint _ of 7' : questComplete ? 'Quest complete' : `Checkpoint ${currentLocationIndex + 1} of 7`}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            <Skel h="15px" r="6px" />
            <Skel w="88%" h="15px" r="6px" />
            <Skel w="74%" h="15px" r="6px" />
          </div>
        ) : (
          <>
            <div
              style={{
                padding: '17px 17px 18px',
                borderRadius: 16,
                border: '1px solid rgba(139,188,212,.17)',
                background: 'linear-gradient(145deg, rgba(139,188,212,.09), rgba(139,188,212,.025))',
              }}
            >
              <div className="label-caps" style={{ marginBottom: 10, color: 'rgba(139,188,212,.78)' }}>
                {questComplete ? 'A message from the professor' : 'Your clue'}
              </div>
              {(questComplete ? EPILOGUE_PARAGRAPHS : [chapter.clue]).map((paragraph) => (
                <p key={paragraph} style={{ fontSize: 15, lineHeight: 1.7, color: '#F2F2F7', margin: '0 0 10px', fontWeight: 450, letterSpacing: '-0.01em' }}>
                  {paragraph}
                </p>
              ))}
            </div>

            {!questComplete && (
              <div
                role={showUnlockedNotice ? 'status' : undefined}
                aria-live={showUnlockedNotice ? 'polite' : undefined}
                style={{
                  marginTop: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: showUnlockedNotice ? '#75E6A0' : isCurrentUnlocked ? '#75E6A0' : 'rgba(242,242,247,.58)',
                  fontSize: 12,
                  fontWeight: showUnlockedNotice ? 650 : 500,
                  padding: showUnlockedNotice ? '11px 12px' : 0,
                  borderRadius: 11,
                  border: showUnlockedNotice ? '1px solid rgba(52,199,89,.28)' : '1px solid transparent',
                  background: showUnlockedNotice ? 'rgba(52,199,89,.1)' : 'transparent',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: showUnlockedNotice || isCurrentUnlocked ? '#34C759' : '#F5C85B', boxShadow: `0 0 10px ${showUnlockedNotice || isCurrentUnlocked ? 'rgba(52,199,89,.6)' : 'rgba(245,200,91,.45)'}` }} />
                {showUnlockedNotice
                  ? `New clue unlocked · Checkpoint ${currentLocationIndex + 1}`
                  : isCurrentUnlocked
                    ? 'Checkpoint reached · challenge ready'
                    : 'Clue unlocked · solve it to find your next checkpoint'}
              </div>
            )}
          </>
        )}

        <div className="divider" style={{ margin: '20px 0 15px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(242,242,247,.45)', fontSize: 11.5 }}>
          <span>{questComplete ? 'Seven symbols recovered' : `Lost Legacy · ${chapter.symbol}`}</span>
          <div
            aria-label={isCurrentUnlocked ? 'Checkpoint unlocked' : 'Checkpoint locked'}
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              background: isCurrentUnlocked ? 'rgba(52,199,89,0.12)' : 'rgba(139,188,212,0.09)',
              border: `1px solid ${isCurrentUnlocked ? 'rgba(52,199,89,0.3)' : 'rgba(139,188,212,0.17)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isCurrentUnlocked ? '#34C759' : 'rgba(139,188,212,0.75)',
            }}
          >
            <IcoMap size={15} />
          </div>
        </div>
      </div>
    </div>
  )
}
