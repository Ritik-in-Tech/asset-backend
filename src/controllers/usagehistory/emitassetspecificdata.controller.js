import { emitRealtimeData } from "../../sockets/emit_data_socket.js";
import { getCurrentIndianTimeRealtime } from "../../utils/helpers/time.helper.js";

export const emitAssetSpecificRealtimeData = async (userId, asset, state) => {
  const consumptionRateKWH = state === "On" ? asset.consumptionRate : 0;
  const consumptionRateRupees =
    state === "On" ? asset.consumptionRate * 1.5 : 0;

  const realTimeData = {
    timestamp: getCurrentIndianTimeRealtime(),
    consumptionRateKWH,
    consumptionRateRupees,
  };

  console.log(realTimeData);

  // Emit the real-time data
  emitRealtimeData(userId.toString(), realTimeData);
};
