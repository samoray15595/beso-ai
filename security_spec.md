# Security Specification - Beso AI

## Data Invariants
1. A video must belong to the user who generated it.
2. Users can only update or delete their own videos and characters.
3. User profiles are private for writes (only owner can write), but public for reads (to show profile names).
4. Videos can be published, which makes them visible to everyone. Drafts are private.

## The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Attempt to create a video with another user's `userId`.
2. **PII Leak**: Attempt to read private user fields if no split collection is used.
3. **Ghost Fields**: Adding `isAdmin: true` to a user profile update.
4. **Orphaned Character**: Creating a video referencing a character that doesn't belong to the user.
5. **State Shortcut**: Moving a video from `draft` to `published` without checking ownership.
6. **Large Payload**: Injecting a 2MB string into the `prompt` field.
7. **Invalid Duration**: Setting duration to 999 seconds (limit is 60).
8. **Malicious ID**: Using a 500-character string as a document ID.
9. **Timestamp Spoofing**: Sending a manual `createdAt` string instead of `request.time`.
10. **Unauthorized Delete**: Deleting someone else's character.
11. **Shadow Update**: Updating `videoUrl` on a published video to point to malicious content.
12. **Blanket Query**: Requesting all private drafts of another user.

## Next Step: Generate firestore.rules
I will now implement these rules focusing on `isValidId`, `isOwner`, and strict schema validation.
