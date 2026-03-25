import { useState, useEffect, useRef } from "react";
import moment from "moment";
import $ from "jquery";

/**
 * Custom hook to manage daterangepicker lifecycle.
 * Handles plugin loading, initialization, sync, and cleanup.
 *
 * @param {Object} options
 * @param {string} options.startDate - YYYY-MM-DD
 * @param {string} options.endDate   - YYYY-MM-DD
 * @param {boolean} options.ready    - Whether the host component is ready (e.g. not loading)
 * @param {function} options.onChange - Called with (startDate, endDate) strings
 * @returns {{ ref: React.RefObject }}
 */
export const useDateRangePicker = ({ startDate, endDate, ready = true, onChange }) => {
    const ref = useRef(null);
    const [pluginReady, setPluginReady] = useState(false);

    // Load daterangepicker plugin once
    useEffect(() => {
        window.moment = moment;
        window.jQuery = window.$ = $;

        import("daterangepicker/daterangepicker.css");
        import("daterangepicker").then(() => {
            setPluginReady(true);
        });
    }, []);

    // Initialize daterangepicker when plugin + DOM are ready
    useEffect(() => {
        if (!pluginReady || !ready || !ref.current) return;

        const $el = $(ref.current);

        $el.daterangepicker(
            {
                startDate: moment(startDate),
                endDate: moment(endDate),
                minDate: moment().subtract(180, "days"),
                maxDate: moment(),
                dateLimit: { days: 31 },
                locale: { format: "MMM D, YYYY" },
                ranges: {
                    Today: [moment(), moment()],
                    Yesterday: [moment().subtract(1, "days"), moment().subtract(1, "days")],
                    "Last 7 Days": [moment().subtract(7, "days"), moment().subtract(1, "days")],
                    "Last 30 Days": [moment().subtract(30, "days"), moment().subtract(1, "days")],
                    "This Month": [moment().startOf("month"), moment().endOf("month")],
                    "Last Month": [
                        moment().subtract(1, "month").startOf("month"),
                        moment().subtract(1, "month").endOf("month"),
                    ],
                    "This Week": [moment().startOf("week"), moment().endOf("week")],
                },
                opens: "left",
                autoUpdateInput: true,
            },
            (start, end) => {
                onChange(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
            }
        );

        return () => {
            const dp = $el.data("daterangepicker");
            if (dp) dp.remove();
        };
    }, [pluginReady, ready]);

    // Sync picker display when dates change externally
    useEffect(() => {
        if (!pluginReady || !ref.current) return;
        const dp = $(ref.current).data("daterangepicker");
        if (dp) {
            dp.setStartDate(moment(startDate));
            dp.setEndDate(moment(endDate));
        }
    }, [startDate, endDate, pluginReady]);

    return { ref };
};
