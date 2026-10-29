import {
  getListAnnouncementsQueryKey,
  useCreateAnnouncement,
  useGetCurrentUser,
  useListAnnouncements,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { AppButton, AppScreen, C, EmptyPanel, ErrorPanel, Field, LoadingPanel, PageHeading, Panel } from '@/components/ui';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AnnouncementsScreen() {
  const queryClient = useQueryClient();
  const profile = useGetCurrentUser();
  const announcements = useListAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState('');
  const isOwner = profile.data?.role === 'owner';

  const publish = async () => {
    if (!title.trim() || !body.trim()) {
      setFormError('Add a title and message before publishing.');
      return;
    }
    setFormError('');
    try {
      await createAnnouncement.mutateAsync({ data: { title: title.trim(), body: body.trim() } });
      setTitle('');
      setBody('');
      await queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not publish this announcement.');
    }
  };

  return (
    <AppScreen>
      <PageHeading
        eyebrow={isOwner ? 'Owner publishing' : 'Business updates'}
        title="Announcements"
        description={isOwner ? 'Publish an update for OKENOVΛ customers.' : 'Updates published by Okenstyles Graphics And Tech.'}
      />

      {isOwner ? (
        <Panel>
          <Text style={{ color: C.foreground, fontFamily: 'SpaceGroteskSemibold', fontSize: 16 }}>New announcement</Text>
          <Field label="Title" value={title} onChangeText={setTitle} placeholder="Short update headline" maxLength={160} editable={!createAnnouncement.isPending} />
          <Field label="Message" value={body} onChangeText={setBody} placeholder="Share the details customers need…" multiline maxLength={4000} editable={!createAnnouncement.isPending} />
          <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 10, textAlign: 'right' }}>{body.length}/4000</Text>
          <AppButton
            label="Publish update"
            onPress={() => void publish()}
            loading={createAnnouncement.isPending}
            disabled={!title.trim() || !body.trim()}
          />
          {formError ? <Text accessibilityRole="alert" style={{ color: '#FF9CA5', fontFamily: 'DMSansMedium', fontSize: 12 }}>{formError}</Text> : null}
        </Panel>
      ) : null}

      {announcements.isLoading ? <LoadingPanel label="Loading announcements…" /> : null}
      {announcements.isError ? <ErrorPanel message="Announcements could not be loaded." onRetry={() => void announcements.refetch()} /> : null}
      {announcements.data?.length ? (
        <View style={{ gap: 10 }}>
          {announcements.data.map((announcement) => (
            <Panel key={announcement.id}>
              <Text style={{ color: C.primary, fontFamily: 'DMSansBold', fontSize: 9, letterSpacing: 1.1 }}>OKENSTYLES GRAPHICS AND TECH</Text>
              <Text style={{ color: C.foreground, fontFamily: 'SpaceGroteskSemibold', fontSize: 17, lineHeight: 23 }}>{announcement.title}</Text>
              <Text style={{ color: '#B4C0D2', fontFamily: 'DMSans', fontSize: 12, lineHeight: 19 }}>{announcement.body}</Text>
              <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 9 }}>
                <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 10 }}>{formatDate(announcement.publishedAt)}</Text>
              </View>
            </Panel>
          ))}
        </View>
      ) : !announcements.isLoading && !announcements.isError ? (
        <EmptyPanel title="No updates published" detail="New business announcements will show here." />
      ) : null}
    </AppScreen>
  );
}
