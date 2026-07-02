import { graphql, isGraphError, responseHasMarker } from '../../fb';

// Schedule one BM for permanent deletion. Irreversible on FB's side (FB queues a
// grace-period delete). GraphQL ScheduleBusinessPortfolioForDeletion, host business.
// Payload shape from doc; variables not yet verified live → marked test-live.
export async function deleteBm(bmId: string): Promise<{ ok: boolean; message: string }> {
  const res = await graphql(
    {
      fb_api_req_friendly_name: 'ScheduleBusinessPortfolioForDeletionMutation',
      doc_id: '25722797610721024',
      variables: JSON.stringify({ input: { client_mutation_id: '1', business_id: bmId } }),
    },
    'business'
  );
  if (isGraphError(res)) return { ok: false, message: res.message };
  // Success marker observed in the captured trace; if absent treat as failure so the
  // row result is truthful rather than optimistic.
  if (responseHasMarker(res, 'business_is_scheduled_for_deletion'))
    return { ok: true, message: `Đã lên lịch xóa BM ${bmId}` };
  return { ok: false, message: `Không xác nhận được lịch xóa BM ${bmId}` };
}
