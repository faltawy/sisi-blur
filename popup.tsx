import React, { useSyncExternalStore } from 'react'
import { extensionSettings, getDefaultSettings, type ExtensionSettings } from "~utils/settings";
import "./styles.css"
import { Switch } from '~ui/components/switch';
import { Label } from '~ui/components/Label';
import { Input } from '~ui/components/Input';

function useSettings() {
  const [settings, _setSettings] = React.useState<ExtensionSettings>(getDefaultSettings());

  React.useEffect(() => {
    async function fetchSettings() {
      const settings = await extensionSettings.get();
      _setSettings(settings);
    }
    fetchSettings();
  }, []);

  React.useEffect(() => {
    return extensionSettings.onChanged(setSettings);
  }, [extensionSettings]);

  function setSettings(ec: ExtensionSettings) {
    extensionSettings.set(ec);
    _setSettings(ec)
  }

  return [settings, setSettings] as const;
}


const EnableBlurCheckbox = () => {
  const [settings, setSettings] = useSettings();

  const handleCheckboxChange = () => {
    setSettings({
      ...settings,
      enabled: !settings.enabled,
    })
  }

  const handleBlurAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({
      ...settings,
      blurAmount: Number(e.target.value),
    })
  }
  return (
    <React.Fragment>

      <div className='flex items-center gap-2 justify-between p-2'>
        <Label>
          Enable / Disable Blur
        </Label>
        <Switch
          checked={settings.enabled}
          onCheckedChange={handleCheckboxChange}
        />
      </div>

      <div className='flex items-center gap-2 justify-between p-2'>
        <Label>
          Blur Amount
        </Label>
        <Input
          type='number'
          value={settings.blurAmount}
          onChange={handleBlurAmountChange}
          className='w-20'
          min={0}
          max={100}
        />
      </div>

    </React.Fragment>

  )
}

export default function IndexPopup() {
  return (
    <div className="w-64 h-fit p-2 bg-background text-foreground">
      <header className="flex items-center justify-between p-2">
        <h2 className="text-xl font-bold">
          Sisi Blur
        </h2>
      </header>
      <main>
        <EnableBlurCheckbox />
      </main>
    </div>
  )
}
