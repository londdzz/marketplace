import { View } from 'react-native';

import { Badge, Button, Card, EmptyState, Input, Screen, Text } from '../components';
import { useTheme } from '../theme';

/**
 * A gallery of every base component, in one place.
 *
 * Not a product screen: it exists so the design system can be reviewed on its
 * own, in both colour schemes, without navigating the app.
 */
export default function DesignGallery() {
  const theme = useTheme();
  const gap = { marginTop: theme.spacing.md };
  const section = { marginTop: theme.spacing.xxl };

  return (
    <Screen scroll>
      <Text variant="display">Design system</Text>
      <Text variant="meta" tone="muted" style={{ marginTop: theme.spacing.xs }}>
        {theme.isDark ? 'Dark' : 'Light'} scheme
      </Text>

      <Text variant="heading" tone="muted" style={section}>
        A listing card
      </Text>

      <Card flush style={gap}>
        <View style={{ height: 150, backgroundColor: theme.colors.skeleton }} />
        <View style={{ padding: theme.spacing.lg }}>
          <Text variant="price">8.950 €</Text>
          <Text variant="bodyStrong" style={{ marginTop: theme.spacing.xxs }}>
            Volkswagen Passat 2.0 TDI
          </Text>
          <Text variant="meta" tone="muted" style={{ marginTop: theme.spacing.xxs }}>
            2016 · 168.000 km · Diesel · Manual
          </Text>
          <Text variant="meta" tone="muted">
            Prishtinë, Kosovë
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
            <Badge label="Cross-border" tone="accent" />
            <Badge label="Customs cleared" tone="success" />
          </View>
        </View>
      </Card>

      <Text variant="heading" tone="muted" style={section}>
        Buttons
      </Text>

      <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }, gap]}>
        <Button label="Publish" onPress={() => {}} />
        <Button label="Filters" variant="secondary" onPress={() => {}} />
        <Button label="Skip" variant="ghost" onPress={() => {}} />
        <Button label="Delete" variant="danger" onPress={() => {}} />
      </View>

      <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }, gap]}>
        <Button label="Small" size="sm" onPress={() => {}} />
        <Button label="Loading" loading onPress={() => {}} />
        <Button label="Disabled" disabled onPress={() => {}} />
      </View>

      <Button label="Continue" size="lg" block style={gap} onPress={() => {}} />

      <Text variant="heading" tone="muted" style={section}>
        Inputs
      </Text>

      <Input
        label="Phone number"
        prefix="+383"
        placeholder="44 123 456"
        keyboardType="phone-pad"
        containerStyle={gap}
      />
      <Input
        label="Price"
        placeholder="8950"
        hint="In euro. Buyers see their own currency too."
        keyboardType="number-pad"
        containerStyle={gap}
      />
      <Input
        label="Verification code"
        placeholder="123456"
        error="That code is not valid."
        containerStyle={gap}
      />

      <Text variant="heading" tone="muted" style={section}>
        Badges
      </Text>

      <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }, gap]}>
        <Badge label="Active" tone="success" />
        <Badge label="Draft" tone="neutral" />
        <Badge label="Expires in 2 days" tone="warning" />
        <Badge label="Expired" tone="danger" />
        <Badge label="Featured" tone="accent" />
      </View>

      <Text variant="heading" tone="muted" style={section}>
        Type scale
      </Text>

      <Card style={gap}>
        <Text variant="price">24.999 €</Text>
        <Text variant="title" style={{ marginTop: theme.spacing.sm }}>
          Title
        </Text>
        <Text variant="body" style={{ marginTop: theme.spacing.xs }}>
          Body copy, the default for anything a person reads in full.
        </Text>
        <Text variant="meta" tone="muted" style={{ marginTop: theme.spacing.xs }}>
          Meta line: 2016 · 168.000 km · Diesel
        </Text>
        <Text variant="caption" tone="subtle" style={{ marginTop: theme.spacing.xs }}>
          Caption, for the smallest print.
        </Text>
      </Card>

      <Text variant="heading" tone="muted" style={section}>
        Empty state
      </Text>

      <Card style={[gap, { marginBottom: theme.spacing.huge }]}>
        <EmptyState
          glyph="🔍"
          title="No cars match that search"
          description="Try widening the price range, or include more countries."
          actionLabel="Clear filters"
          onAction={() => {}}
        />
      </Card>
    </Screen>
  );
}
