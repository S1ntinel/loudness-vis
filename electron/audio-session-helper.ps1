[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('list', 'set-volume', 'set-mute')]
  [string]$Action,

  [string]$SessionId,
  [int]$VolumePercent,
  [string]$Muted
)

$ErrorActionPreference = 'Stop'

$source = @"
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public enum EDataFlow
{
    eRender,
    eCapture,
    eAll,
    EDataFlow_enum_count
}

public enum ERole
{
    eConsole,
    eMultimedia,
    eCommunications,
    ERole_enum_count
}

public enum AudioSessionState
{
    AudioSessionStateInactive = 0,
    AudioSessionStateActive = 1,
    AudioSessionStateExpired = 2
}

[Flags]
public enum CLSCTX : uint
{
    INPROC_SERVER = 0x1,
    INPROC_HANDLER = 0x2,
    LOCAL_SERVER = 0x4,
    REMOTE_SERVER = 0x10,
    ALL = INPROC_SERVER | INPROC_HANDLER | LOCAL_SERVER | REMOTE_SERVER
}

[ComImport]
[Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
public class MMDeviceEnumeratorComObject
{
}

[ComImport]
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDeviceEnumerator
{
    int EnumAudioEndpoints(EDataFlow dataFlow, int dwStateMask, out object ppDevices);
    int GetDefaultAudioEndpoint(EDataFlow dataFlow, ERole role, out IMMDevice ppDevice);
    int GetDevice(string pwstrId, out IMMDevice ppDevice);
    int RegisterEndpointNotificationCallback(IntPtr pClient);
    int UnregisterEndpointNotificationCallback(IntPtr pClient);
}

[ComImport]
[Guid("D666063F-1587-4E43-81F1-B948E807363F")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDevice
{
    int Activate(ref Guid iid, CLSCTX dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
    int OpenPropertyStore(int stgmAccess, out IntPtr ppProperties);
    int GetId([MarshalAs(UnmanagedType.LPWStr)] out string ppstrId);
    int GetState(out int pdwState);
}

[ComImport]
[Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionManager2
{
    int GetAudioSessionControl(ref Guid AudioSessionGuid, uint StreamFlags, out IntPtr SessionControl);
    int GetSimpleAudioVolume(ref Guid AudioSessionGuid, uint StreamFlags, out IntPtr AudioVolume);
    int GetSessionEnumerator(out IAudioSessionEnumerator SessionEnum);
    int RegisterSessionNotification(IntPtr SessionNotification);
    int UnregisterSessionNotification(IntPtr SessionNotification);
    int RegisterDuckNotification(string sessionID, IntPtr duckNotification);
    int UnregisterDuckNotification(IntPtr duckNotification);
}

[ComImport]
[Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionEnumerator
{
    int GetCount(out int SessionCount);
    int GetSession(int SessionCount, out IAudioSessionControl Session);
}

[ComImport]
[Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionControl2
{
    int GetState(out AudioSessionState pRetVal);
    int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
    int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
    int GetGroupingParam(out Guid pRetVal);
    int SetGroupingParam(ref Guid Override, ref Guid EventContext);
    int RegisterAudioSessionNotification(IntPtr NewNotifications);
    int UnregisterAudioSessionNotification(IntPtr NewNotifications);
    int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    int GetProcessId(out uint pRetVal);
    int IsSystemSoundsSession();
    int SetDuckingPreference([MarshalAs(UnmanagedType.Bool)] bool optOut);
}

[ComImport]
[Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface ISimpleAudioVolume
{
    int SetMasterVolume(float fLevel, ref Guid EventContext);
    int GetMasterVolume(out float pfLevel);
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, ref Guid EventContext);
    int GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
}

[ComImport]
[Guid("F4B1A599-7266-4319-A8CA-E70ACB11E8CD")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionControl
{
}

public class AudioSessionInfo
{
    public string SessionId { get; set; }
    public string DisplayName { get; set; }
    public string ProcessName { get; set; }
    public uint ProcessId { get; set; }
    public bool IsSystemSession { get; set; }
    public bool Active { get; set; }
    public bool Muted { get; set; }
    public int VolumePercent { get; set; }
    public string ExePath { get; set; }
    public string IconDataUrl { get; set; }
}

public static class AudioSessionBridge
{
    public static AudioSessionInfo[] ListSessions()
    {
        var sessions = new List<AudioSessionInfo>();
        var sessionEnumerator = GetSessionEnumerator();
        try
        {
            int count;
            sessionEnumerator.GetCount(out count);
            for (int i = 0; i < count; i++)
            {
                IAudioSessionControl sessionControl;
                sessionEnumerator.GetSession(i, out sessionControl);
                if (sessionControl == null)
                {
                    continue;
                }

                try
                {
                    var session = ConvertToInfo(sessionControl);
                    if (session != null)
                    {
                        sessions.Add(session);
                    }
                }
                finally
                {
                    ReleaseCom(sessionControl);
                }
            }
        }
        finally
        {
            ReleaseCom(sessionEnumerator);
        }

        sessions.Sort((a, b) =>
        {
            int activeCompare = b.Active.CompareTo(a.Active);
            if (activeCompare != 0) return activeCompare;
            return string.Compare(a.DisplayName, b.DisplayName, StringComparison.OrdinalIgnoreCase);
        });

        return sessions.ToArray();
    }

    public static AudioSessionInfo SetSessionVolume(string sessionId, int volumePercent)
    {
        return UpdateSession(sessionId, volume =>
        {
            Guid context = Guid.Empty;
            float next = Math.Max(0, Math.Min(100, volumePercent)) / 100f;
            volume.SetMasterVolume(next, ref context);
        });
    }

    public static AudioSessionInfo SetSessionMute(string sessionId, bool muted)
    {
        return UpdateSession(sessionId, volume =>
        {
            Guid context = Guid.Empty;
            volume.SetMute(muted, ref context);
        });
    }

    private static AudioSessionInfo UpdateSession(string sessionId, Action<ISimpleAudioVolume> updater)
    {
        var sessionEnumerator = GetSessionEnumerator();
        try
        {
            int count;
            sessionEnumerator.GetCount(out count);
            for (int i = 0; i < count; i++)
            {
                IAudioSessionControl sessionControl;
                sessionEnumerator.GetSession(i, out sessionControl);
                if (sessionControl == null)
                {
                    continue;
                }

                var control2 = (IAudioSessionControl2)sessionControl;
                try
                {
                    AudioSessionState state;
                    control2.GetState(out state);
                    if (state == AudioSessionState.AudioSessionStateExpired)
                    {
                        continue;
                    }

                    string instanceIdentifier;
                    string identifier;
                    uint processId;
                    control2.GetSessionInstanceIdentifier(out instanceIdentifier);
                    control2.GetSessionIdentifier(out identifier);
                    control2.GetProcessId(out processId);
                    string currentId = BuildSessionId(instanceIdentifier, identifier, processId);
                    if (!string.Equals(currentId, sessionId, StringComparison.Ordinal))
                    {
                        continue;
                    }

                    var volume = (ISimpleAudioVolume)sessionControl;
                    updater(volume);

                    return ConvertToInfo(sessionControl);
                }
                finally
                {
                    ReleaseCom(sessionControl);
                }
            }
        }
        finally
        {
            ReleaseCom(sessionEnumerator);
        }

        throw new InvalidOperationException("Target audio session was not found.");
    }

    private static IAudioSessionEnumerator GetSessionEnumerator()
    {
        var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
        try
        {
            IMMDevice device;
            Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(EDataFlow.eRender, ERole.eMultimedia, out device));
            try
            {
                Guid iid = typeof(IAudioSessionManager2).GUID;
                object managerObject;
                Marshal.ThrowExceptionForHR(device.Activate(ref iid, CLSCTX.ALL, IntPtr.Zero, out managerObject));
                var manager = (IAudioSessionManager2)managerObject;
                try
                {
                    IAudioSessionEnumerator sessionEnumerator;
                    Marshal.ThrowExceptionForHR(manager.GetSessionEnumerator(out sessionEnumerator));
                    return sessionEnumerator;
                }
                finally
                {
                    ReleaseCom(manager);
                }
            }
            finally
            {
                ReleaseCom(device);
            }
        }
        finally
        {
            ReleaseCom(enumerator);
        }
    }

    private static AudioSessionInfo ConvertToInfo(IAudioSessionControl sessionControl)
    {
        var control2 = (IAudioSessionControl2)sessionControl;
        var volume = (ISimpleAudioVolume)sessionControl;
        try
        {
            AudioSessionState state;
            control2.GetState(out state);
            if (state == AudioSessionState.AudioSessionStateExpired)
            {
                return null;
            }

            string instanceIdentifier;
            string identifier;
            uint processId;
            string displayName;
            float level;
            bool muted;
            control2.GetSessionInstanceIdentifier(out instanceIdentifier);
            control2.GetSessionIdentifier(out identifier);
            control2.GetProcessId(out processId);
            control2.GetDisplayName(out displayName);
            volume.GetMasterVolume(out level);
            volume.GetMute(out muted);

            bool isSystem = processId == 0;
            string processName = isSystem ? "System Sounds" : "Unknown App";
            string exePath = null;

            if (!isSystem && processId > 0)
            {
                try
                {
                    using (var process = Process.GetProcessById((int)processId))
                    {
                        processName = string.IsNullOrWhiteSpace(process.ProcessName) ? processName : process.ProcessName;
                        try
                        {
                            exePath = process.MainModule != null ? process.MainModule.FileName : null;
                        }
                        catch
                        {
                            exePath = null;
                        }
                    }
                }
                catch
                {
                    processName = "Unknown App";
                }
            }

            string normalizedDisplayName = displayName;
            if (string.IsNullOrWhiteSpace(normalizedDisplayName) || normalizedDisplayName.StartsWith("@%SystemRoot%", StringComparison.OrdinalIgnoreCase))
            {
                normalizedDisplayName = isSystem ? "System Sounds" : processName;
            }

            string title = normalizedDisplayName;

            return new AudioSessionInfo
            {
                SessionId = BuildSessionId(instanceIdentifier, identifier, processId),
                DisplayName = title,
                ProcessName = processName,
                ProcessId = processId,
                IsSystemSession = isSystem,
                Active = state == AudioSessionState.AudioSessionStateActive,
                Muted = muted,
                VolumePercent = (int)Math.Round(level * 100f, MidpointRounding.AwayFromZero),
                ExePath = exePath,
                IconDataUrl = TryExtractIconDataUrl(exePath, isSystem)
            };
        }
        finally
        {
        }
    }

    private static string BuildSessionId(string instanceIdentifier, string identifier, uint processId)
    {
        if (!string.IsNullOrWhiteSpace(identifier))
        {
            return identifier + "|" + processId.ToString();
        }
        return "pid:" + processId.ToString();
    }

    private static string TryExtractIconDataUrl(string exePath, bool isSystem)
    {
        try
        {
            if (isSystem || string.IsNullOrWhiteSpace(exePath) || !File.Exists(exePath))
            {
                return null;
            }

            using (var icon = Icon.ExtractAssociatedIcon(exePath))
            {
                if (icon == null)
                {
                    return null;
                }

                using (var bitmap = new Bitmap(24, 24))
                using (var graphics = Graphics.FromImage(bitmap))
                using (var ms = new MemoryStream())
                {
                    graphics.Clear(Color.Transparent);
                    graphics.DrawIcon(icon, new Rectangle(0, 0, 24, 24));
                    bitmap.Save(ms, ImageFormat.Png);
                    return "data:image/png;base64," + Convert.ToBase64String(ms.ToArray());
                }
            }
        }
        catch
        {
            return null;
        }
    }

    private static void ReleaseCom(object value)
    {
        if (value != null && Marshal.IsComObject(value))
        {
            Marshal.ReleaseComObject(value);
        }
    }
}
"@

Add-Type -ReferencedAssemblies @('System.Drawing') -TypeDefinition $source

switch ($Action) {
  'list' {
    [AudioSessionBridge]::ListSessions() | ConvertTo-Json -Depth 6 -Compress
  }
  'set-volume' {
    if ([string]::IsNullOrWhiteSpace($SessionId)) {
      throw 'SessionId is required for set-volume.'
    }
    [AudioSessionBridge]::SetSessionVolume($SessionId, $VolumePercent) | ConvertTo-Json -Depth 6 -Compress
  }
  'set-mute' {
    if ([string]::IsNullOrWhiteSpace($SessionId)) {
      throw 'SessionId is required for set-mute.'
    }
    $nextMuted = $false
    if ($Muted -match '^(?i:true|1|yes)$') {
      $nextMuted = $true
    }
    [AudioSessionBridge]::SetSessionMute($SessionId, $nextMuted) | ConvertTo-Json -Depth 6 -Compress
  }
}
