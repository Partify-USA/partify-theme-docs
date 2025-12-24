import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";

const FeatureList = [
	{
		title: "Theme Logic",
		Svg: require("@site/static/img/undraw_docusaurus_mountain.svg").default,
		description: (
			<>
				Documentation covering Partify theme codes works — including VIN and
				license plate flows, paint code validation, and variant selection across
				aftermarket, CAPA, and OEM parts.
			</>
		),
	},
	{
		title: "Shopify Theme Architecture",
		Svg: require("@site/static/img/undraw_docusaurus_tree.svg").default,
		description: (
			<>
				A clear breakdown of our Shopify Liquid theme structure, data flow
				between Liquid and JavaScript, and how critical components like
				add-to-cart, modals, and fitment checks are wired together.
			</>
		),
	},
	{
		title: "Powered by Partify",
		Svg: require("@site/static/img/undraw_docusaurus_react.svg").default,
		description: (
			<>
				Hard-earned knowledge documenting Shopify quirks, third-party app
				integrations, known failure modes, and the edge cases unique to selling
				custom painted auto body parts at scale.
			</>
		),
	},
];

function Feature({ Svg, title, description }) {
	return (
		<div className={clsx("col col--4")}>
			<div className="text--center">
				<Svg className={styles.featureSvg} role="img" />
			</div>
			<div className="text--center padding-horiz--md">
				<Heading as="h3">{title}</Heading>
				<p>{description}</p>
			</div>
		</div>
	);
}

export default function HomepageFeatures() {
	return (
		<section className={styles.features}>
			<div className="container">
				<div className="row">
					{FeatureList.map((props, idx) => (
						<Feature key={idx} {...props} />
					))}
				</div>
			</div>
		</section>
	);
}
