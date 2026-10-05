import { Redirect, useRoute } from "wouter";
import { isVisibleSignSlot } from "src/data/signCategories";

/** Older links opened a separate group page. The catalog now lives on the road-signs tab. */
export default function DashboardRoadSignTopicProgress() {
  const [match, params] = useRoute("/dashboard/learn/road-signs/category/:topicId");
  const topicId = params?.topicId?.trim() ?? "";
  if (!match || !isVisibleSignSlot(topicId)) return <Redirect to="/dashboard/learn/road-signs" />;
  return <Redirect to={`/dashboard/learn/road-signs?topic=${topicId}`} />;
}
