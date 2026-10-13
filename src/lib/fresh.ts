import { revalidatePath } from "next/cache";

/**
 * Tab pages are kept in the browser for instant switching (next.config staleTimes, TabBar
 * prefetch); after a change they are dropped, so none shows old numbers. For server actions.
 */
export const freshPages = () => revalidatePath("/", "layout");
