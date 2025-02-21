import type { IsolineConstraint } from "../../hooks/here-maps";
import { computedLabelbubblePosition } from "./ui";

// * for isoline stuff
const LABEL_UI_STYLE = {
	time: {
		strokeColor: "rgba(240, 177, 0, 0.5)",
		fillColor: "rgba(240, 177, 0, 0.25)",
		labelColor: "rgba(240, 177, 0, 1)",
	},
	distance: {
		strokeColor: "rgba(0, 201, 81, 0.5)",
		fillColor: "rgba(0, 201, 81, 0.25)",
		labelColor: "rgba(0, 201, 81, 1)",
	},
	consumption: {
		strokeColor: "rgba(255, 255, 255, 0.5)",
		fillColor: "rgba(255, 255, 255, 0.25)",
		labelColor: "rgba(255, 255, 255, 1)",
	},
};
const computedLabelElement = ({
	firstSectionCoordinates,
	constraint,
}: {
	firstSectionCoordinates: H.geo.Point[];
	constraint: IsolineConstraint;
}) => {
	const { labelLat, labelLng } = computedLabelbubblePosition(
		firstSectionCoordinates,
	);
	const rangeType = constraint.type;
	const rangeValue = constraint.value;

	// Format label text based on range type
	const labelText =
		rangeType === "time"
			? `${Math.round(rangeValue / 60)} min`
			: `${(rangeValue / 1000).toFixed(1)} km`;

	// Create DOM element for the label
	const labelElement = document.createElement("div");

	// Create a circle element for color referencing
	const colorCircle = document.createElement("span");
	colorCircle.style.display = "inline-block";
	colorCircle.style.width = "10px";
	colorCircle.style.height = "10px";
	colorCircle.style.backgroundColor = LABEL_UI_STYLE[rangeType].labelColor;
	colorCircle.style.borderRadius = "50%";
	colorCircle.style.marginRight = "4px";

	// Append the circle and label text to the label element
	labelElement.appendChild(colorCircle);
	labelElement.appendChild(document.createTextNode(labelText));

	labelElement.style.backgroundColor = "rgba(255, 255, 255, 0.75)";
	labelElement.style.border = "1px solid #666";
	labelElement.style.borderRadius = "4px";
	labelElement.style.padding = "2px 8px";
	labelElement.style.fontSize = "12px";
	labelElement.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
	labelElement.style.whiteSpace = "nowrap";

	return { labelLat, labelLng, labelElement, labelText };
};

const isolineLib = { LABEL_UI_STYLE, computedLabelElement };

export default isolineLib;
