import { ClientUpdate } from "./network";

export function networkDebugOverlay(clientUpdates: Map<number, ClientUpdate>): void {
  let overlay = document.getElementById("network");

  const formatNumber = (num: number): string => {
    const sign = num < 0 ? "-" : "+";
    const absoluteValue = Math.abs(num);
    const wholePart = Math.floor(absoluteValue);
    const decimalPart = parseFloat((absoluteValue - wholePart).toFixed(2));
    const formattedWholePart = wholePart.toString().padStart(2, "0");
    const formattedDecimalPart = decimalPart.toFixed(2).slice(2);
    return `${sign}${formattedWholePart}.${formattedDecimalPart}`;
  };

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "network";
    overlay.className = "network-overlay";
    document.body.appendChild(overlay);
  }

  let tableHTML = `
    <table>
      <tr>
        <th>ID</th>
        <th>Location</th>
        <th>Rotation</th>
        <th>State</th>
      </tr>
    `;

  clientUpdates.forEach((update, id) => {
    const location = update.location;
    const rotation = update.rotation;
    const state = update.state;

    tableHTML += `
      <tr>
        <td class="id">${id}</td>
        <td class="location">x: ${formatNumber(location.x)}, y: 0, z: ${formatNumber(
      location.y,
    )}</td>
        <td class="rotation">x: 0, y: ${formatNumber(rotation.x)}, z: 0, w: ${formatNumber(
      rotation.y,
    )}</td>
        <td class="state">${state}</td>
      </tr>`;
  });

  tableHTML += `</table>`;
  overlay.innerHTML = tableHTML;
}
