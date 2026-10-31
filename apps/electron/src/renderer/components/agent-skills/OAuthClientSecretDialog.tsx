import * as React from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { useT } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface OAuthClientSecretDialogProps {
  serverName: string | null
  onOpenChange: (open: boolean) => void
  onSave: (clientSecret: string) => Promise<void>
}

/** 用户显式输入 OAuth client secret 的最小安全入口；值只通过 IPC 送入 Keychain。 */
export function OAuthClientSecretDialog({ serverName, onOpenChange, onSave }: OAuthClientSecretDialogProps): React.ReactElement {
  const t = useT()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (inputRef.current) inputRef.current.value = ''
    setSaving(false)
  }, [serverName])

  const handleSave = async (): Promise<void> => {
    const clientSecret = inputRef.current?.value ?? ''
    if (!clientSecret.trim() || saving) return
    setSaving(true)
    try {
      await onSave(clientSecret)
      if (inputRef.current) inputRef.current.value = ''
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(serverName)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] p-7" onOpenAutoFocus={(event) => event.preventDefault()}>
        {serverName && <>
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold"><KeyRound size={19} />{t('skills.oauthSecretDialog.title')}</DialogTitle>
            <DialogDescription className="text-[15px] leading-6">
              {t('skills.oauthSecretDialog.description', { name: serverName })}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-7">
            <label htmlFor="oauth-client-secret" className="text-sm font-medium text-foreground">Client Secret <span className="text-destructive">*</span></label>
            <Input
              id="oauth-client-secret"
              autoComplete="off"
              type="password"
              className="mt-2 h-12 text-sm"
              placeholder={t('skills.oauthSecretDialog.placeholder')}
              ref={inputRef}
              onKeyDown={(event) => { if (event.key === 'Enter') void handleSave() }}
            />
          </div>
          <DialogFooter className="mt-7 gap-3 sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t('common.cancel')}</Button>
            <Button onClick={() => { void handleSave() }} disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              {t('skills.oauthSecretDialog.saveAndContinue')}
            </Button>
          </DialogFooter>
        </>}
      </DialogContent>
    </Dialog>
  )
}
