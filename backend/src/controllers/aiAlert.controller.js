import AiAlert from "../models/AiAlert.js";

export const resolveAlertByUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { alertId } = req.params;

    const alert = await AiAlert.findOne({
      _id: alertId,
      userId,
      status: "active",
    });

    if (!alert) {
      return res
        .status(404)
        .json({ message: "Alert not found or already resolved" });
    }

    alert.status = "resolved";
    alert.resolvedAt = new Date();
    alert.resolvedBy = "user";
    alert.resolutionReason = "user_acknowledged";
    alert.resolvedCount = (alert.resolvedCount || 0) + 1;
    await alert.save();

    res.json({ message: "Alert resolved", alert });
  } catch (err) {
    console.error("resolveAlertByUser error", err);
    res.status(500).json({ message: "Server error" });
  }
};
