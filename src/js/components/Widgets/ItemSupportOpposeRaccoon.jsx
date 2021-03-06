import React, { Component, PropTypes } from "react";
import { OverlayTrigger, Popover } from "react-bootstrap";
import { Link, browserHistory } from "react-router";
import CandidateActions from "../../actions/CandidateActions";
import CandidateStore from "../../stores/CandidateStore";
import FollowToggle from "./FollowToggle";
import ItemActionBar from "../Widgets/ItemActionBar";
import ItemTinyPositionBreakdownList from "../Position/ItemTinyPositionBreakdownList";
import OrganizationCard from "../VoterGuide/OrganizationCard";
import OrganizationsNotShownList from "../VoterGuide/OrganizationsNotShownList";
import SupportStore from "../../stores/SupportStore";

export default class ItemSupportOpposeRaccoon extends Component {
  static propTypes = {
    ballot_item_display_name: PropTypes.string,
    ballotItemWeVoteId: PropTypes.string,
    maximumOrganizationDisplay: PropTypes.number,
    organizationsToFollowSupport: PropTypes.array,
    organizationsToFollowOppose: PropTypes.array,
    positionBarIsClickable: PropTypes.bool,
    supportProps: PropTypes.object,
    toggleCandidateModal: PropTypes.func,
  };

  constructor (props) {
    super(props);

    this.popover_state = {};
    this.mobile = "ontouchstart" in document.documentElement;

    this.state = {
      ballot_item_display_name: "",
      ballot_item_we_vote_id: "",
      candidate: {},
      maximum_organization_display: 0,
      organizations_to_follow_support: [],
      organizations_to_follow_oppose: [],
      position_list_from_advisers_followed_by_voter: [],
      supportProps: this.props.supportProps,
    };

    this.goToCandidateLink = this.goToCandidateLink.bind(this);
  }

  componentDidMount () {
    this.candidateStoreListener = CandidateStore.addListener(this.onCandidateStoreChange.bind(this));
    CandidateActions.positionListForBallotItem(this.props.ballotItemWeVoteId);
    this.setState({
      ballot_item_display_name: this.props.ballot_item_display_name,
      ballot_item_we_vote_id: this.props.ballotItemWeVoteId,
      candidate: CandidateStore.getCandidate(this.props.ballotItemWeVoteId),
      maximum_organization_display: this.props.maximumOrganizationDisplay,
      organizations_to_follow_support: this.props.organizationsToFollowSupport,
      organizations_to_follow_oppose: this.props.organizationsToFollowOppose,
      position_list_from_advisers_followed_by_voter: CandidateStore.getPositionList(this.props.ballotItemWeVoteId),
      supportProps: this.props.supportProps,
    });
  }

  componentWillReceiveProps (nextProps) {
    this.setState({
      ballot_item_display_name: nextProps.ballot_item_display_name,
      ballot_item_we_vote_id: nextProps.ballotItemWeVoteId,
      candidate: CandidateStore.getCandidate(nextProps.ballotItemWeVoteId),
      maximum_organization_display: nextProps.maximumOrganizationDisplay,
      organizations_to_follow_support: nextProps.organizationsToFollowSupport,
      organizations_to_follow_oppose: nextProps.organizationsToFollowOppose,
      position_list_from_advisers_followed_by_voter: CandidateStore.getPositionList(nextProps.ballotItemWeVoteId),
      supportProps: nextProps.supportProps,
    });
  }

  componentWillUnmount () {
    this.candidateStoreListener.remove();
  }

  onCandidateStoreChange () {
    this.setState({
      candidate: CandidateStore.getCandidate(this.state.ballot_item_we_vote_id),
      position_list_from_advisers_followed_by_voter: CandidateStore.getPositionList(this.state.ballot_item_we_vote_id),
    });
  }

  onTriggerEnter (org_id, visible_tag) {
    if (this.refs[`cheetah-overlay-${org_id}-${visible_tag}`]) {
      this.refs[`cheetah-overlay-${org_id}-${visible_tag}`].show();
    }
    if (!this.popover_state[org_id]) {
      // If it wasn't created, create it now
      this.popover_state[org_id] = {show: false, timer: null};
    }
    clearTimeout(this.popover_state[org_id].timer);
    this.popover_state[org_id].show = true;
  }

  onTriggerLeave (org_id, visible_tag) {
    if (!this.popover_state[org_id]) {
      // If it wasn't created, create it now
      this.popover_state[org_id] = {show: false, timer: null};
    }
    this.popover_state[org_id].show = false;
    clearTimeout(this.popover_state[org_id].timer);
    this.popover_state[org_id].timer = setTimeout(() => {
      if (!this.popover_state[org_id].show) {
        if (this.refs[`cheetah-overlay-${org_id}-${visible_tag}`]) {
          this.refs[`cheetah-overlay-${org_id}-${visible_tag}`].hide();
        }
      }
    }, 100);
  }

  onTriggerToggle (e, org_id, visible_tag) {
    if (this.mobile) {
      e.preventDefault();
      e.stopPropagation();
      if (!this.popover_state[org_id]) {
        // If it wasn't created, create it now
        this.popover_state[org_id] = {show: false, timer: null};
      }

      if (this.popover_state[org_id].show) {
        this.onTriggerLeave(org_id, visible_tag);
      } else {
        this.onTriggerEnter(org_id, visible_tag);
      }
    }
  }

  percentageMajority () {
    const { support_count, oppose_count } = this.state.supportProps;
    return Math.round(100 * Math.max(support_count, oppose_count) / (support_count + oppose_count));
  }

  organizationsToDisplay (organizations_to_follow, maximum_organization_display, ballot_item_we_vote_id, visible_tag, supports_this_ballot_item = false, opposes_this_ballot_item = false) {
    if (!maximum_organization_display || maximum_organization_display === 0) {
      return [];
    }

    let local_counter = 0;
    let orgs_not_shown_count = 0;
    let orgs_not_shown_list = [];
    let one_organization_for_organization_card;
    if (organizations_to_follow &&
      organizations_to_follow.length > maximum_organization_display) {
      orgs_not_shown_count = organizations_to_follow.length - maximum_organization_display;
      orgs_not_shown_list = organizations_to_follow.slice(maximum_organization_display);
    }
    return organizations_to_follow.map( (one_organization) => {
      local_counter++;
      let org_id = one_organization.organization_we_vote_id;

      // Once we have more organizations than we want to show, put them into a drop-down
      if (local_counter > maximum_organization_display) {
        if (local_counter === maximum_organization_display + 1) {
          // If here, we want to show how many organizations there are to follow
          // Using orgs_not_shown_count as the key seems arbitrary and could cause a collision
          this.popover_state[orgs_not_shown_count] = {show: false, timer: null};
          let organizationPopover = <Popover
              id={`organization-popover-${orgs_not_shown_count}-${visible_tag}`}
              onMouseOver={() => this.onTriggerEnter(orgs_not_shown_count, visible_tag)}
              onMouseOut={() => this.onTriggerLeave(orgs_not_shown_count, visible_tag)}
              className="card-popover">
              <OrganizationsNotShownList orgs_not_shown_list={orgs_not_shown_list} />
            </Popover>;

          return <OverlayTrigger
              key={`trigger-${orgs_not_shown_count}-${visible_tag}`}
              ref={`cheetah-overlay-${orgs_not_shown_count}-${visible_tag}`}
              onMouseOver={() => this.onTriggerEnter(orgs_not_shown_count, visible_tag)}
              onMouseOut={() => this.onTriggerLeave(orgs_not_shown_count, visible_tag)}
              onExiting={() => this.onTriggerLeave(orgs_not_shown_count, visible_tag)}
              trigger={["focus", "hover"]}
              rootClose
              placement="bottom"
              overlay={organizationPopover}>
            <span className="position-rating__source with-popover">
              <Link to="/opinions"> +{orgs_not_shown_count}</Link>
            </span>
          </OverlayTrigger>;
        } else {
          return "";
        }
      } else {
        one_organization_for_organization_card = {
            organization_we_vote_id: one_organization.organization_we_vote_id,
            organization_name: one_organization.voter_guide_display_name,
            organization_photo_url_large: one_organization.voter_guide_image_url_large,
            organization_photo_url_tiny: one_organization.voter_guide_image_url_tiny,
            organization_twitter_handle: one_organization.twitter_handle,
            // organization_website: one_organization.organization_website,
            twitter_description: one_organization.twitter_description,
            twitter_followers_count: one_organization.twitter_followers_count,
          };

        this.popover_state[org_id] = {show: false, timer: null};

        let organizationPopover = <Popover
            id={`organization-popover-${org_id}-${visible_tag}`}
            onMouseOver={() => this.onTriggerEnter(org_id, visible_tag)}
            onMouseOut={() => this.onTriggerLeave(org_id, visible_tag)}
            className="card-popover">
            <OrganizationCard organization={one_organization_for_organization_card}
                              ballotItemWeVoteId={ballot_item_we_vote_id}
                              followToggleOn />
          </Popover>;

        return <OverlayTrigger
            key={`trigger-${org_id}-${visible_tag}`}
            ref={`cheetah-overlay-${org_id}-${visible_tag}`}
            onMouseOver={() => this.onTriggerEnter(org_id, visible_tag)}
            onMouseOut={() => this.onTriggerLeave(org_id, visible_tag)}
            onExiting={() => this.onTriggerLeave(org_id, visible_tag)}
            trigger={["focus", "hover"]}
            rootClose
            placement="bottom"
            overlay={organizationPopover}>
          <span className="position-rating__source with-popover">
            <FollowToggle we_vote_id={one_organization.organization_we_vote_id}
                          organization_for_display={one_organization}
                          classNameOverride="pull-left"
                          supportsThisBallotItem={supports_this_ballot_item}
                          opposesThisBallotItem={opposes_this_ballot_item} />
          </span>
        </OverlayTrigger>;
      }
    });
  }

  goToCandidateLink (candidate_we_vote_id) {
    browserHistory.push("/candidate/" + candidate_we_vote_id);
  }

  render () {
    let candidateSupportStore = SupportStore.get(this.state.ballot_item_we_vote_id);
    let candidate_support_action_raccoon = <span>
      <ItemActionBar ballot_item_display_name={this.state.ballot_item_display_name}
                     ballot_item_we_vote_id={this.state.ballot_item_we_vote_id}
                     commentButtonHide
                     opposeHideInMobile
                     shareButtonHide
                     supportProps={candidateSupportStore}
                     transitioning={this.state.transitioning}
                     type="CANDIDATE"/>
      </span>;

    let support_count = 0;
    let oppose_count = 0;
    let total_score = 0;
    let total_score_with_sign;
    if (this.state.supportProps !== undefined) {
      support_count = parseInt(this.state.supportProps.support_count) || 0;
      oppose_count = parseInt(this.state.supportProps.oppose_count) || 0;
      total_score = parseInt(support_count - oppose_count);
      if (total_score > 0) {
        total_score_with_sign = "+" + total_score;
      } else if (total_score < 0) {
        total_score_with_sign = total_score;
      } else {
        total_score_with_sign = total_score;
      }
    }

    let positions_exist = support_count || oppose_count || this.state.organizations_to_follow_support || this.state.organizations_to_follow_oppose;
    let maximum_organizations_to_show_desktop = 8;
    let maximum_organizations_to_show_mobile = 5;

    let organizations_to_follow_support_desktop = [];
    let organizations_to_follow_support_mobile = [];
    let organizations_to_follow_oppose_desktop = [];
    let organizations_to_follow_oppose_mobile = [];

    // console.log("this.state.position_list_from_advisers_followed_by_voter: ", this.state.position_list_from_advisers_followed_by_voter);
    if (positions_exist) {
      // console.log("ItemSupportOpposeCheetah, this.state.ballot_item_we_vote_id: ", this.state.ballot_item_we_vote_id);
      let support_positions_list_count = 0;
      let oppose_positions_list_count = 0;
      // let info_only_positions_list_count = 0;
      this.state.position_list_from_advisers_followed_by_voter.map((one_position) => {
        // console.log("one_position: ", one_position);
        // Filter out the positions that we don't want to display
        if (one_position.is_support_or_positive_rating) {
          support_positions_list_count++;
        } else if (one_position.is_oppose_or_negative_rating) {
          oppose_positions_list_count++;
        } // else if (!one_position.is_support_or_positive_rating && !one_position.is_oppose_or_negative_rating) {
        //   info_only_positions_list_count++;
        // }
      });
      // console.log("support_positions_list_count:", support_positions_list_count);

      // We calculate how many organizations_to_follow based on the number of positions from advisers we follow
      const offset_for_more_text = 3;
      let organizations_to_follow_support_desktop_to_show = maximum_organizations_to_show_desktop - support_positions_list_count - offset_for_more_text;
      organizations_to_follow_support_desktop_to_show = organizations_to_follow_support_desktop_to_show >= 0 ? organizations_to_follow_support_desktop_to_show : 0;
      let organizations_to_follow_support_mobile_to_show = maximum_organizations_to_show_mobile - support_positions_list_count - offset_for_more_text;
      organizations_to_follow_support_mobile_to_show = organizations_to_follow_support_mobile_to_show >= 0 ? organizations_to_follow_support_mobile_to_show : 0;
      let organizations_to_follow_oppose_desktop_to_show = maximum_organizations_to_show_desktop - oppose_positions_list_count - offset_for_more_text;
      organizations_to_follow_oppose_desktop_to_show = organizations_to_follow_oppose_desktop_to_show >= 0 ? organizations_to_follow_oppose_desktop_to_show : 0;
      let organizations_to_follow_oppose_mobile_to_show = maximum_organizations_to_show_mobile - oppose_positions_list_count - offset_for_more_text;
      organizations_to_follow_oppose_mobile_to_show = organizations_to_follow_oppose_mobile_to_show >= 0 ? organizations_to_follow_oppose_mobile_to_show : 0;

      //console.log("organizations_to_follow_support_mobile_to_show:", organizations_to_follow_support_mobile_to_show);

      organizations_to_follow_support_desktop = this.organizationsToDisplay(this.state.organizations_to_follow_support, organizations_to_follow_support_desktop_to_show, this.state.ballot_item_we_vote_id, "desktop", true, false);
      organizations_to_follow_support_mobile = this.organizationsToDisplay(this.state.organizations_to_follow_support, organizations_to_follow_support_mobile_to_show, this.state.ballot_item_we_vote_id, "mobile", true, false);
      organizations_to_follow_oppose_desktop = this.organizationsToDisplay(this.state.organizations_to_follow_oppose, organizations_to_follow_oppose_desktop_to_show, this.state.ballot_item_we_vote_id, "desktop", false, true);
      organizations_to_follow_oppose_mobile = this.organizationsToDisplay(this.state.organizations_to_follow_oppose, organizations_to_follow_oppose_mobile_to_show, this.state.ballot_item_we_vote_id, "mobile", false, true);
    }

    return <div className="network-positions-stacked">
      <div className="network-positions-stacked__support">
        {/* Support toggle here */}
        {candidate_support_action_raccoon}

        {/* Support Score here */}
        <div className="network-positions-stacked__count">
          <span className="network-positions__support-score u-cursor--pointer u-no-break" onClick={() => this.goToCandidateLink(this.state.ballot_item_we_vote_id)}>
            { total_score === 0 ? <span>&nbsp;&nbsp;&nbsp;{ total_score_with_sign }&nbsp;</span> : <span>&nbsp;{ total_score_with_sign }&nbsp;</span>}
          </span>
          <span className="sr-only">{total_score > 0 ? total_score + " Support" : null }{total_score < 0 ? total_score + " Oppose" : null }</span>
        </div>

        {/* Show a break-down of the positions in your network */}
        <span className="u-flex u-justify-between u-inset__v--xs">
          <ItemTinyPositionBreakdownList ballot_item_display_name={this.state.ballot_item_display_name}
                                         ballotItemWeVoteId={this.state.ballot_item_we_vote_id}
                                         position_list={this.state.position_list_from_advisers_followed_by_voter}
                                         showSupport
                                         supportProps={this.state.supportProps} />
        </span>
        <span className="u-flex u-justify-between u-inset__v--xs">
          <ItemTinyPositionBreakdownList ballot_item_display_name={this.state.ballot_item_display_name}
                                         ballotItemWeVoteId={this.state.ballot_item_we_vote_id}
                                         position_list={this.state.position_list_from_advisers_followed_by_voter}
                                         showOppose
                                         supportProps={this.state.supportProps}/>
        </span>

        {/* Show support positions the voter can follow Desktop */}
        { organizations_to_follow_support_desktop.length ?
          <span className="hidden-xs">
            {organizations_to_follow_support_desktop}
          </span> :
          null }
        {/* Show support positions the voter can follow Mobile */}
        { organizations_to_follow_support_mobile.length ?
          <span className="visible-xs">
            {organizations_to_follow_support_mobile}
          </span> :
          null }
        {/* Show oppose positions the voter can follow Desktop */}
        { organizations_to_follow_oppose_desktop.length ?
          <span className="hidden-xs">
            {organizations_to_follow_oppose_desktop}
          </span> :
          null }

        {/* Show oppose positions the voter can follow Mobile */}
        { organizations_to_follow_oppose_mobile.length ?
          <span className="visible-xs">
            {organizations_to_follow_oppose_mobile}
          </span> :
          null }
      </div>
    </div>;
  }
}
