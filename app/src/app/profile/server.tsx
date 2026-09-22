import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import {
  API_URL_IS_SETTABLE,
  BUILT_IN_API_URL,
  apiUrl,
  setApiUrlOverride,
} from "../../api/config";
import { referenceApi } from "../../api/reference";
import {
  Button,
  EmptyState,
  Input,
  Screen,
  StackHeader,
  Text,
} from "../../components";
import { useTheme } from "../../theme";

/**
 * Where this build's API lives, for a build that is allowed to be told.
 *
 * It exists so a phone can be pointed at a PC on the same wifi without a
 * rebuild, and it is compiled into nothing useful in a released app: without
 * EXPO_PUBLIC_ALLOW_API_OVERRIDE the screen refuses and the address is fixed.
 *
 * Saving checks the address before keeping it. An app silently pointed at
 * somewhere that does not answer looks identical to an app that is broken, and
 * the whole reason for this screen is somebody trying to find out which.
 */
export default function ServerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation(["profile", "common"]);

  const [value, setValue] = useState(apiUrl());
  const [checking, setChecking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!API_URL_IS_SETTABLE) {
    return (
      <Screen>
        <StackHeader fallback="/(tabs)/profile" backLabel={t("common:back")} />
        <EmptyState
          glyph="🔒"
          title={t("profile:server_locked")}
          description={t("profile:server_locked_body")}
        />
      </Screen>
    );
  }

  async function save(next: string | null) {
    setChecking(true);
    setFailure(null);
    setSaved(false);

    const previous = apiUrl();

    await setApiUrlOverride(next);

    try {
      // A request that needs no account and no data, so it says one thing
      // only: something is answering at this address and it is our API.
      await referenceApi.countries();

      // Everything already fetched came from the old address. Left in place it
      // would be one server's cars over another server's makes, which is a
      // harder thing to make sense of than an empty screen.
      queryClient.clear();

      setSaved(true);
      setValue(apiUrl());
    } catch (error) {
      // Put it back rather than leaving the app pointed at nothing.
      await setApiUrlOverride(previous === BUILT_IN_API_URL ? null : previous);
      setValue(apiUrl());
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setChecking(false);
    }
  }

  return (
    <Screen scroll>
      <StackHeader fallback="/(tabs)/profile" backLabel={t("common:back")} />

      <Text variant="title">{t("profile:server")}</Text>
      <Text variant="meta" tone="muted" style={{ marginTop: theme.spacing.sm }}>
        {t("profile:server_body")}
      </Text>

      <Input
        label={t("profile:server_label")}
        placeholder="http://192.168.1.20:8000/api/v1"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        value={value}
        onChangeText={setValue}
        error={failure ?? undefined}
        hint={saved ? t("profile:server_saved") : t("profile:server_hint")}
        containerStyle={{ marginTop: theme.spacing.xl }}
        testID="server-url"
      />

      <Button
        label={t("common:save")}
        size="lg"
        block
        loading={checking}
        onPress={() => void save(value)}
        style={{ marginTop: theme.spacing.lg }}
        testID="server-save"
      />

      <View style={{ marginTop: theme.spacing.md }}>
        <Button
          label={t("profile:server_reset")}
          variant="secondary"
          size="lg"
          block
          disabled={checking}
          onPress={() => void save(null)}
          testID="server-reset"
        />
      </View>

      <Text
        variant="caption"
        tone="subtle"
        style={{ marginTop: theme.spacing.xl }}
      >
        {t("profile:server_built_in", { url: BUILT_IN_API_URL })}
      </Text>

      <Button
        label={t("common:done")}
        variant="secondary"
        size="lg"
        block
        onPress={() => router.back()}
        style={{ marginTop: theme.spacing.lg }}
      />
    </Screen>
  );
}
