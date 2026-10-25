# Family Kindle Edition workflow

The Family Kindle Edition is an **opt-in, private EPUB export**, separate from the 365-day published book. Selecting a lesson for family sharing does **not** approve it for public publication or change its reading-day assignment.

## First export
1. Sign into DevoBase on your usual computer and open **Book Admin**.
2. Under **Lesson review**, check **Include in Family Kindle Edition** for each lesson you want your sons to read.
3. Select **Download Family EPUB**. The EPUB contains only the checked lessons, ordered by the current suggested reading days.
4. Open https://www.amazon.com/sendtokindle and upload the EPUB to your Kindle library. Choose the intended devices/accounts, subject to Amazon's account and child-profile restrictions.
5. On the Kindle device or Kindle iPhone app, sync the library and open **DevoBase Family Devotionals**. Verify it works under the child's Screen Time restrictions.

## Updating later
1. Add or revise lessons in DevoBase as usual.
2. Open **Book Admin**, review the saved selection, and check any new lessons to share.
3. Download a new EPUB and upload it using **Send to Kindle**.
4. The updated EPUB may appear as a **new personal document**, not an in-place update. Remove or archive the old copy on each Kindle account/device as needed. Bookmarks and reading position may not transfer between editions.

## Important limits
- Selection is saved in **this browser's localStorage only**, not synced across devices. Clearing browser data resets the selection.
- EPUB is generated in the browser. No Supabase records, publication flags, or reading-day assignments are written.
- Only lessons with a devotional thought and prayer can be exported; incomplete selections produce an error.
- Suggested reading days are provisional and may change as the library grows.
- No Kindle delivery or syncing is automated. Send to Kindle requires an Amazon account and network access when transferring.
- EPUB files are unencrypted; share them only with intended recipients.
